import {test,expect} from '@playwright/test';

test('customer rejects repair, technician sees the reason and completes a second repair',async({browser,request})=>{
  const loginApi=async(email)=>{
    const r=await request.post('/api/auth/login',{data:{email,password:'FixFlow123!'}});expect(r.ok()).toBeTruthy();return r.json();
  };
  const customerAuth=await loginApi('customer@fixflow.local'),adminAuth=await loginApi('admin@fixflow.local'),techAuth=await loginApi('tech@fixflow.local');
  const auth=token=>({Authorization:`Bearer ${token}`});const title=`驗收退回 ${Date.now()}`;
  const created=await request.post('/api/tickets',{headers:auth(customerAuth.token),data:{title,description:'空調仍有漏水',location:'測試辦公室',category:'AIR_CONDITIONING',priority:'HIGH'}});expect(created.status()).toBe(201);const ticket=await created.json();
  expect((await request.patch(`/api/tickets/${ticket.id}/assign`,{headers:auth(adminAuth.token),data:{technicianId:techAuth.user.id}})).ok()).toBeTruthy();
  expect((await request.patch(`/api/tickets/${ticket.id}/status`,{headers:auth(techAuth.token),data:{status:'IN_PROGRESS'}})).ok()).toBeTruthy();
  expect((await request.post(`/api/tickets/${ticket.id}/repair-records`,{headers:auth(techAuth.token),data:{description:'第一次清理排水管'}})).status()).toBe(201);
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);const [customer,tech]=await Promise.all(contexts.map(c=>c.newPage()));
  const open=async(page,email)=>{
    await page.goto('/system.html');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill('FixFlow123!');await page.getByRole('button',{name:'登入',exact:true}).click();
    await page.getByRole('button',{name:'工單中心',exact:true}).click();await page.getByRole('textbox',{name:'搜尋工單'}).fill(title);await page.getByRole('button',{name:'搜尋',exact:true}).click();
    await page.getByRole('button',{name:title,exact:true}).first().click();await expect(page.locator('.detail-badges')).toContainText('待確認');
  };
  try{
    await open(customer,'customer@fixflow.local');await open(tech,'tech@fixflow.local');
    await expect(tech.getByRole('button',{name:'退回維修',exact:true})).toBeVisible();
    await customer.setViewportSize({width:390,height:844});
    await customer.getByLabel('退回原因',{exact:true}).fill('試運轉十分鐘後仍漏水，請檢查接頭。');
    await customer.getByRole('button',{name:'退回維修',exact:true}).click();
    await expect(customer.locator('.detail-badges')).toContainText('已派工');await expect(customer.locator('.rework-entry')).toContainText('仍漏水');
    expect(await customer.getByRole('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    await customer.locator('.rework-entry').scrollIntoViewIfNeeded();await customer.screenshot({path:'test-results/rework-mobile.png',fullPage:true});
    await tech.getByRole('button',{name:'返回列表',exact:true}).click();await tech.getByRole('button',{name:title,exact:true}).first().click();await expect(tech.locator('.detail-badges')).toContainText('已派工');await expect(tech.locator('.rework-entry')).toContainText('仍漏水');
    await tech.getByRole('button',{name:'開始維修',exact:true}).click();await tech.getByLabel('維修紀錄',{exact:true}).fill('第二次更換接頭，持續測試無漏水。');await tech.getByLabel('實際工時（小時）',{exact:true}).fill('1');await tech.getByRole('button',{name:'提交維修完成'}).click();
    await expect(tech.locator('.detail-badges')).toContainText('待確認');
    await customer.getByRole('button',{name:'返回列表',exact:true}).click();await customer.getByRole('button',{name:title,exact:true}).first().click();await expect(customer.locator('.detail-badges')).toContainText('待確認');await customer.getByRole('button',{name:'確認結案'}).click();
    await expect(customer.locator('.detail-badges')).toContainText('已結案');await expect(customer.getByRole('dialog')).toContainText('第一次清理排水管');await expect(customer.getByRole('dialog')).toContainText('第二次更換接頭');await expect(customer.locator('.rework-entry')).toHaveCount(1);
    await expect(customer.getByRole('button',{name:'退回維修',exact:true})).toHaveCount(0);
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});
