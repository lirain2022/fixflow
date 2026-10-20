import {test,expect} from '@playwright/test';

async function login(page,email,password='FixFlow123!'){
  await page.goto(email==='admin@fixflow.local'?'/system.html?portal=admin':'/system.html');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill(password);await page.getByRole('button',{name:'登入',exact:true}).click();await expect(page.getByRole('heading',{name:'工作首頁'})).toBeVisible();
}
test('row editing preserves conflicting text and reloads the current version',async({browser,request})=>{
  const auth=await request.post('/api/auth/login',{data:{email:'customer@fixflow.local',password:'FixFlow123!'}});const {token}=await auth.json();const title=`編輯驗證 ${Date.now()}`;
  const created=await request.post('/api/tickets',{headers:{Authorization:`Bearer ${token}`},data:{title,description:'original notes',location:'Room',category:'OTHER',priority:'LOW'}});expect(created.status()).toBe(201);const ticket=await created.json();
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);const [owner,admin]=await Promise.all(contexts.map(c=>c.newPage()));
  const open=async(page,email)=>{await login(page,email);await page.getByRole('button',{name:'工單中心',exact:true}).click();await page.getByRole('textbox',{name:'搜尋工單'}).fill(title);await page.getByRole('button',{name:'搜尋',exact:true}).click();await page.getByRole('button',{name:`編輯 ${ticket.ticketNo}`,exact:true}).first().click();await expect(page.getByRole('dialog')).toBeVisible();};
  try{
    await open(owner,'customer@fixflow.local');await open(admin,'admin@fixflow.local');
    await admin.getByRole('textbox',{name:'問題描述',exact:true}).fill('Admin updated notes');await admin.getByRole('button',{name:'儲存變更',exact:true}).click();await expect(admin.getByRole('dialog')).toHaveCount(0);await expect(admin.getByRole('status').filter({hasText:'工單已儲存'})).toBeVisible();
    await owner.getByRole('textbox',{name:'問題描述',exact:true}).fill('My unsaved notes');await owner.getByRole('button',{name:'儲存變更',exact:true}).click();await expect(owner.getByRole('alert')).toContainText('工單已被更新');await expect(owner.getByRole('textbox',{name:'問題描述',exact:true})).toHaveValue('My unsaved notes');await expect(owner.getByRole('button',{name:'儲存變更',exact:true})).toBeDisabled();
    await owner.screenshot({path:'test-results/edit-conflict.png',fullPage:true});owner.once('dialog',d=>d.accept());await owner.getByRole('button',{name:'重新載入最新工單',exact:true}).click();await expect(owner.getByRole('textbox',{name:'問題描述',exact:true})).toHaveValue('Admin updated notes');
    await owner.getByRole('textbox',{name:'問題描述',exact:true}).fill('Admin updated notes; owner confirmed');await owner.getByRole('button',{name:'儲存變更',exact:true}).click();await expect(owner.getByRole('dialog')).toHaveCount(0);
    await owner.setViewportSize({width:390,height:844});await expect(owner.getByRole('button',{name:`編輯 ${ticket.ticketNo}`,exact:true}).last()).toBeVisible();expect(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await owner.screenshot({path:'test-results/ticket-row-edit-mobile.png',fullPage:true});
    await owner.getByRole('button',{name:`查看 ${ticket.ticketNo}`,exact:true}).last().click();await expect(owner.getByRole('dialog')).toContainText('Admin updated notes; owner confirmed');owner.once('dialog',d=>d.accept());await owner.getByRole('button',{name:'取消工單',exact:true}).click();await expect(owner.locator('.detail-badges')).toContainText('已取消');await owner.getByRole('button',{name:'返回列表'}).click();await expect(owner.getByRole('button',{name:`編輯 ${ticket.ticketNo}`,exact:true}).last()).toBeDisabled();
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});

test('password change logs out old sessions and allows only the new password',async({browser,request})=>{
  const email=`password-ui-${Date.now()}@example.com`,oldPassword='Original123!',newPassword='Updated456!';
  const registration=await request.post('/api/auth/register',{data:{name:'Password browser test',email,password:oldPassword}});expect(registration.status()).toBe(201);const {token}=await registration.json();
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);const [page,other]=await Promise.all(contexts.map(c=>c.newPage()));
  try{
    await login(page,email,oldPassword);await login(other,email,oldPassword);await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'修改密碼',exact:true}).click();await page.getByLabel('目前密碼',{exact:true}).fill('Incorrect123!');await page.getByLabel('新密碼',{exact:true}).fill(newPassword);await page.getByLabel('再次輸入新密碼',{exact:true}).fill(newPassword);await page.getByRole('button',{name:'確認修改密碼'}).click();await expect(page.getByRole('alert')).toContainText('目前密碼不正確');await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('目前密碼',{exact:true}).fill(oldPassword);await page.getByRole('button',{name:'確認修改密碼'}).click();await expect(page.getByRole('heading',{name:'會員登入'})).toBeVisible();await expect(page.getByRole('status')).toContainText('密碼已更新');
    await other.getByRole('button',{name:'重新整理',exact:true}).click();await expect(other.getByRole('heading',{name:'會員登入'})).toBeVisible();
    expect((await request.get('/api/users/me',{headers:{Authorization:`Bearer ${token}`}})).status()).toBe(401);
    await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill(oldPassword);await page.getByRole('button',{name:'登入',exact:true}).click();await expect(page.getByRole('alert')).toContainText('不正確');
    await page.getByLabel('密碼',{exact:true}).fill(newPassword);await page.getByRole('button',{name:'登入',exact:true}).click();await expect(page.getByRole('heading',{name:'工作首頁'})).toBeVisible();
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});
