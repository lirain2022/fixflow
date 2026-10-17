import {test,expect} from '@playwright/test';

test('one ordinary account manages equipment and completes a ticket assigned to someone else',async({page,request})=>{
 const stamp=Date.now(),password='UnifiedPass123!',email=`single-${stamp}@example.com`;
 const create=async(name,email)=>(await (await request.post('/api/auth/register',{data:{name,email,password}})).json());
 const owner=await create('單一操作帳號',email),worker=await create('負責人',`single-worker-${stamp}@example.com`);
 await page.goto('/system.html');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill(password);await page.getByRole('button',{name:'登入',exact:true}).click();
 await page.getByRole('button',{name:'設備管理',exact:true}).click();await page.getByRole('button',{name:'新增設備',exact:true}).click();
 await page.getByLabel('設備編號',{exact:true}).fill(`UNI-${stamp}`);await page.getByLabel('設備名稱',{exact:true}).fill('單帳號設備');await page.getByLabel('設備位置',{exact:true}).fill('B1');await page.getByLabel('設備分類',{exact:true}).selectOption('OTHER');await page.getByRole('button',{name:'儲存設備',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 const title=`同帳號完成 ${stamp}`,headers={Authorization:`Bearer ${owner.token}`};
 const response=await request.post('/api/tickets',{headers,data:{title,description:'Fault',location:'B1',category:'OTHER',priority:'LOW'}});expect(response.status()).toBe(201);
 await page.getByRole('button',{name:'工單中心',exact:true}).click();await page.getByRole('button',{name:title,exact:true}).first().click();
 await page.getByRole('dialog').getByLabel('指派人員').selectOption(String(worker.user.id));await page.getByRole('dialog').getByRole('button',{name:'確認派工',exact:true}).click();await expect(page.locator('.detail-badges')).toContainText('已派工');
 await page.getByRole('dialog').getByRole('button',{name:'開始維修',exact:true}).click();await expect(page.locator('.detail-badges')).toContainText('維修中');
 await page.getByRole('textbox',{name:'維修紀錄',exact:true}).fill('已處理完成');await page.getByLabel('實際工時（小時）').fill('1');await page.getByLabel('人工費（NT$）',{exact:true}).fill('100');
 await page.getByRole('button',{name:'儲存費用草稿'}).click();await expect(page.getByLabel('維修費用',{exact:true})).toContainText('NT$ 100.00');
 await page.getByRole('button',{name:'提交維修完成'}).click();await expect(page.locator('.detail-badges')).toContainText('待驗收');await page.getByRole('button',{name:'確認結案',exact:true}).click();await expect(page.locator('.detail-badges')).toContainText('已結案');
 await expect(page.locator('.detail-meta')).toContainText('負責人');await expect(page.locator('.repair-entry')).toContainText('單一操作帳號');
 await page.getByRole('button',{name:'返回列表',exact:true}).click();await page.getByRole('button',{name:'派工中心',exact:true}).click();await page.getByRole('button',{name:'已結案／費用',exact:true}).click();
 await page.getByRole('button',{name:`查看費用 ${title}`,exact:true}).click();await expect(page.locator('.detail-meta')).toContainText('一般報修');await expect(page.getByLabel('維修費用',{exact:true})).toContainText('NT$ 100.00');await expect(page.locator('.repair-entry')).toContainText('NT$ 100.00');
 await page.getByRole('button',{name:'返回列表',exact:true}).click();await page.getByRole('button',{name:'設備管理',exact:true}).click();
 await page.getByRole('button',{name:'未連結工單與費用',exact:true}).click();const pending=page.getByRole('region',{name:'未連結設備的工單與費用'});const row=pending.locator('.asset-history-row').filter({hasText:title});await expect(row).toContainText('NT$ 100.00');await row.getByRole('button',{name:/補連結設備/}).click();
 await page.getByLabel('搜尋設備',{exact:true}).fill(`UNI-${stamp}`);await page.getByLabel('報修設備').selectOption({label:`UNI-${stamp} · 單帳號設備`});await page.getByRole('button',{name:'確認連結',exact:true}).click();await expect(row).toHaveCount(0);
 await page.getByRole('button',{name:'查看設備履歷',exact:true}).click();await expect(page.locator('.asset-history-row')).toContainText(title);await expect(page.getByLabel('設備維修統計')).toContainText('NT$ 100.00');
 const second=await (await request.post('/api/tickets',{headers,data:{title:`漏建設備 ${stamp}`,description:'Fault',location:'B2',category:'OTHER',priority:'LOW'}})).json();const path=`/api/tickets/${second.id}`;
 expect((await request.patch(path+'/assign',{headers,data:{technicianId:owner.user.id}})).status()).toBe(200);expect((await request.patch(path+'/status',{headers,data:{status:'IN_PROGRESS'}})).status()).toBe(200);expect((await request.post(path+'/repair-records',{headers,data:{description:'Fixed',workHours:'1',laborCost:'250'}})).status()).toBe(201);expect((await request.patch(path+'/status',{headers,data:{status:'CLOSED'}})).status()).toBe(200);
 await page.getByRole('button',{name:'返回設備列表',exact:true}).click();await pending.getByRole('button',{name:`補連結設備 ${second.ticketNo}`,exact:true}).click();await page.getByRole('button',{name:'新增設備再連結',exact:true}).click();
 await page.getByLabel('設備編號',{exact:true}).fill(`LATE-${stamp}`);await page.getByLabel('設備名稱',{exact:true}).fill('補建設備');await page.getByLabel('設備位置',{exact:true}).fill('B2');await page.getByRole('button',{name:'儲存設備',exact:true}).click();await expect(page.getByLabel('報修設備')).not.toHaveValue('');await page.getByRole('button',{name:'確認連結',exact:true}).click();
 await page.getByRole('button',{name:'查看設備履歷',exact:true}).click();await expect(page.getByLabel('設備維修統計')).toContainText('NT$ 250.00');await expect(page.locator('.asset-history-row')).toContainText('已結案');
});

test('a registered reporter assigns their own ticket without changing accounts',async({page,request})=>{
  const auth=await (await request.post('/api/auth/login',{data:{email:'customer@fixflow.local',password:'FixFlow123!'}})).json();
  const title=`列表派工 ${Date.now()}`;const created=await request.post('/api/tickets',{headers:{Authorization:`Bearer ${auth.token}`},data:{title,description:'Inline assignment',location:'Lab',category:'OTHER',priority:'LOW'}});expect(created.status()).toBe(201);const ticket=await created.json();
  await page.goto('/system.html');await page.getByLabel('Email',{exact:true}).fill('customer@fixflow.local');await page.getByLabel('密碼',{exact:true}).fill('FixFlow123!');await page.getByRole('button',{name:'登入',exact:true}).click();await page.getByRole('button',{name:'工單中心',exact:true}).click();
  await page.getByRole('textbox',{name:'搜尋工單'}).fill(title);await page.getByRole('button',{name:'搜尋',exact:true}).click();
  await page.getByRole('button',{name:`派工 ${ticket.ticketNo}`,exact:true}).filter({visible:true}).click();
  await expect(page.getByRole('dialog')).toContainText(title);const select=page.getByLabel('選擇處理人員');await expect(select.locator('option')).not.toHaveCount(1);const value=await select.locator('option').nth(1).getAttribute('value');await select.selectOption(value);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/inline-assignment-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'確認派工',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('textbox',{name:'搜尋工單'})).toHaveValue(title);await expect(page.getByRole('heading',{name:'我的工單',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:`改派 ${ticket.ticketNo}`,exact:true}).filter({visible:true})).toBeVisible();
});

test('two ordinary registered accounts dispatch and complete work in the same system',async({browser,request})=>{
  const stamp=Date.now(),password='UnifiedPass123!';
  const ownerEmail=`owner-${stamp}@example.com`,workerEmail=`worker-${stamp}@example.com`;
  const registered=[];
  for(const [email,name] of [[ownerEmail,'一般報修人'],[workerEmail,'一般處理人']]){
    const res=await request.post('/api/auth/register',{data:{email,name,password}});expect(res.status()).toBe(201);registered.push(await res.json());
  }
  const worker=registered[1].user;
  const title=`一般帳號完整派工 ${stamp}`;
  const created=await request.post('/api/tickets',{headers:{Authorization:`Bearer ${registered[0].token}`},data:{title,description:'不需技師或管理員帳號',location:'2F',category:'OTHER',priority:'LOW'}});expect(created.status()).toBe(201);const ticket=await created.json();
  const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844}}),browser.newContext()]);
  const [owner,handler]=await Promise.all(contexts.map(c=>c.newPage()));
  async function login(page,email){await page.goto('/system.html');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill(password);await page.getByRole('button',{name:'登入',exact:true}).click();await page.getByRole('button',{name:'工單中心',exact:true}).click();}
  try{
    await login(owner,ownerEmail);
    await owner.getByRole('button',{name:`派工 ${ticket.ticketNo}`,exact:true}).filter({visible:true}).click();
    await owner.getByLabel('選擇處理人員').selectOption(String(worker.id));
    await owner.getByRole('button',{name:'確認派工',exact:true}).click();await expect(owner.getByRole('dialog')).toHaveCount(0);
    await owner.screenshot({path:'test-results/ordinary-account-dispatch-mobile.png',fullPage:true});
    expect(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await login(handler,workerEmail);await handler.getByRole('button',{name:title,exact:true}).first().click();
    await expect(handler.getByLabel('指派人員')).toBeVisible();
    await handler.getByRole('dialog').getByRole('button',{name:'開始維修',exact:true}).click();await handler.getByLabel('維修紀錄',{exact:true}).fill('一般帳號完成檢查與維修');await handler.getByLabel('實際工時（小時）',{exact:true}).fill('1');await handler.getByRole('button',{name:'提交維修完成'}).click();await expect(handler.locator('.detail-badges')).toContainText('待驗收');
    await owner.getByRole('button',{name:'重新整理',exact:true}).click();await owner.getByRole('button',{name:title,exact:true}).first().click();await owner.getByRole('button',{name:'確認結案'}).click();await expect(owner.locator('.detail-badges')).toContainText('已結案');
    await expect(owner.getByRole('button',{name:'帳號管理',exact:true})).toHaveCount(0);
    const admin=await (await browser.newContext()).newPage();
    try{
      await admin.goto('/system.html');await admin.getByLabel('Email',{exact:true}).fill('admin@fixflow.local');await admin.getByLabel('密碼',{exact:true}).fill('FixFlow123!');await admin.getByRole('button',{name:'登入',exact:true}).click();await admin.getByRole('button',{name:'工單中心',exact:true}).click();
      await admin.getByRole('combobox',{name:'處理人員',exact:true}).selectOption(String(worker.id));await expect(admin.getByRole('button',{name:title,exact:true}).first()).toBeVisible();
    }finally{await admin.context().close();}
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});
test('home leads to dispatch with real workload counts and mobile layout',async({page,request})=>{
  const login=await request.post('/api/auth/login',{data:{email:'customer@fixflow.local',password:'FixFlow123!'}});expect(login.ok()).toBeTruthy();
  const {token}=await login.json();const title=`統一派工 ${Date.now()}`;
  const created=await request.post('/api/tickets',{headers:{Authorization:`Bearer ${token}`},data:{title,description:'驗證派工中心整合',location:'展示空間',category:'OTHER',priority:'HIGH'}});expect(created.status()).toBe(201);
  await page.goto('/system.html');await page.getByLabel('Email',{exact:true}).fill('admin@fixflow.local');await page.getByLabel('密碼',{exact:true}).fill('FixFlow123!');await page.getByRole('button',{name:'登入',exact:true}).click();
  await expect(page.getByRole('heading',{name:'工作首頁'})).toBeVisible();await expect(page.getByRole('button',{name:/待派工 \d+/})).toBeVisible();
  await page.getByRole('button',{name:'前往派工中心'}).click();await expect(page.getByRole('heading',{name:'派工中心'})).toBeVisible();
  await page.getByRole('textbox',{name:'搜尋派工工單'}).fill(title);await page.getByRole('button',{name:'搜尋',exact:true}).click();
  await expect(page.getByRole('button',{name:`查看 ${title}`,exact:true})).toBeVisible();await expect(page.locator('.dispatch-people')).toHaveCount(0);await expect(page.getByRole('radio')).toHaveCount(0);
  await page.screenshot({path:'test-results/workspace-dispatch-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.getByRole('navigation',{name:'主要導覽'}).evaluate(nav=>nav.scrollWidth<=nav.clientWidth)).toBe(true);
  await page.screenshot({path:'test-results/workspace-dispatch-mobile.png',fullPage:true});
  await page.getByRole('button',{name:`查看 ${title}`,exact:true}).click();await page.getByRole('dialog').getByLabel('指派人員').selectOption({label:'維修技師 (tech@fixflow.local)'});await page.getByRole('dialog').getByRole('button',{name:'確認派工',exact:true}).click();await expect(page.locator('.detail-badges')).toContainText('已派工');await page.getByRole('button',{name:'返回列表',exact:true}).click();await expect(page.locator('.dispatch-ticket').filter({hasText:title})).toHaveCount(0);
  await page.getByRole('button',{name:'工作首頁',exact:true}).click();await page.getByRole('button',{name:/逾期未完成 \d+/}).click();await expect(page.getByRole('checkbox',{name:'只看逾期'})).toBeChecked();
  await page.getByRole('button',{name:'工單中心',exact:true}).click();await expect(page.getByRole('checkbox',{name:'只看逾期'})).not.toBeChecked();
  await page.getByRole('combobox',{name:'工單狀態'}).selectOption('ASSIGNED');
  await page.getByRole('button',{name:'工單中心',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'工單狀態'})).toHaveValue('');
  await page.getByRole('button',{name:'前往派工中心'}).click();await page.getByRole('button',{name:'查看已派工單'}).click();await expect(page.getByRole('heading',{name:'派工中心',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'查看已派工單'})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.dispatch-ticket').filter({hasText:title})).toBeVisible();
  await page.getByRole('button',{name:`查看 ${title}`,exact:true}).click();await page.getByRole('button',{name:'開始維修',exact:true}).click();await expect(page.locator('.detail-badges')).toContainText('維修中');
  await page.getByLabel('人工費（NT$）',{exact:true}).fill('120');await page.getByRole('button',{name:'儲存費用草稿',exact:true}).click();await expect(page.getByLabel('維修費用',{exact:true})).toContainText('NT$ 120.00');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'上一步',exact:true}).click();await expect(page.locator('.detail-badges')).toContainText('已派工');await expect(page.getByLabel('維修費用',{exact:true})).toContainText('NT$ 120.00');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'上一步',exact:true}).click();await expect(page.locator('.detail-badges')).toContainText('待派工');await expect(page.getByRole('button',{name:'上一步',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'返回列表',exact:true}).click();await expect(page.locator('.dispatch-ticket').filter({hasText:title})).toHaveCount(0);await page.getByRole('button',{name:'待派工',exact:true}).click();await expect(page.locator('.dispatch-ticket').filter({hasText:title})).toContainText('尚未指派');
});
