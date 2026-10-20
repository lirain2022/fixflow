import {test,expect} from '@playwright/test';

test('draft survives refresh and close, respects Escape, and clears after submission',async({page,request})=>{
  const email=`draft-${Date.now()}@example.com`,password='DraftTest123!';
  expect((await request.post('/api/auth/register',{data:{name:'草稿驗收',email,password}})).status()).toBe(201);
  await page.goto(email==='admin@fixflow.local'?'/system.html?portal=admin':'/system.html');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill(password);await page.getByRole('button',{name:'登入',exact:true}).click();
  const openNew=async()=>{await page.getByRole('button',{name:'工單中心',exact:true}).click();await page.getByRole('button',{name:'新增工單',exact:true}).click();};
  await openNew();const title=`Draft saved ${Date.now()}`;
  await page.getByRole('textbox',{name:'問題標題',exact:true}).fill(title);await page.getByRole('textbox',{name:'問題描述',exact:true}).fill('Keep these repair notes');await page.getByRole('textbox',{name:'報修位置',exact:true}).fill('3F');
  await expect(page.getByRole('status').filter({hasText:'草稿已暫存'})).toBeVisible();
  page.once('dialog',async d=>{expect(d.type()).toBe('beforeunload');await d.accept();});await page.reload();
  await openNew();await expect(page.getByRole('button',{name:'恢復草稿'})).toBeVisible();await expect(page.getByRole('textbox',{name:'問題標題',exact:true})).toHaveValue('');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/draft-recovery-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'恢復草稿'}).click();await expect(page.getByRole('textbox',{name:'問題標題',exact:true})).toHaveValue(title);
  page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'關閉視窗'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'新增工單',exact:true}).click();await page.getByRole('button',{name:'恢復草稿'}).click();await page.getByRole('button',{name:'送出報修',exact:true}).click();
  await expect(page.locator('.detail-title')).toHaveText(title);await expect(page.getByRole('dialog')).toContainText('Keep these repair notes');await page.getByRole('button',{name:'返回列表'}).click();
  await page.getByRole('button',{name:'新增工單',exact:true}).click();await expect(page.getByRole('button',{name:'恢復草稿'})).toHaveCount(0);await expect(page.getByRole('textbox',{name:'問題標題',exact:true})).toHaveValue('');
});

test('another tab discarding a draft immediately warns the original editor',async({page,context,request})=>{
  const email=`draft-tabs-${Date.now()}@example.com`,password='DraftTabs123!';
  const registered=await request.post('/api/auth/register',{data:{name:'多分頁草稿驗收',email,password}});expect(registered.status()).toBe(201);const {token}=await registered.json();
  const created=await request.post('/api/tickets',{headers:{Authorization:`Bearer ${token}`},data:{title:'Draft tab ticket',description:'Original',location:'Room',category:'OTHER',priority:'LOW'}});expect(created.status()).toBe(201);const ticket=await created.json();
  const edit=async p=>{await p.goto(email==='admin@fixflow.local'?'/system.html?portal=admin':'/system.html');await p.getByLabel('Email',{exact:true}).fill(email);await p.getByLabel('密碼',{exact:true}).fill(password);await p.getByRole('button',{name:'登入',exact:true}).click();await p.getByRole('button',{name:'工單中心',exact:true}).click();await p.getByRole('button',{name:`編輯 ${ticket.ticketNo}`,exact:true}).click();};
  await edit(page);await page.getByRole('textbox',{name:'問題標題',exact:true}).fill('Keep original tab input');await expect(page.getByRole('status').filter({hasText:'草稿已暫存'})).toBeVisible();
  const other=await context.newPage();await edit(other);await other.getByRole('button',{name:'捨棄草稿'}).click();
  await expect(page.getByRole('status').filter({hasText:'另一個分頁已更新草稿'})).toBeVisible();await expect(page.getByRole('status').filter({hasText:'草稿已暫存'})).toHaveCount(0);await expect(page.getByRole('textbox',{name:'問題標題',exact:true})).toHaveValue('Keep original tab input');
  await page.getByRole('button',{name:'儲存變更',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Keep original tab input',exact:true})).toBeVisible();await other.close();
});
