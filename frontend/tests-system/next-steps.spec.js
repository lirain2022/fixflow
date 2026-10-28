import {registerStaff} from './staff-fixture';
import {test,expect} from '@playwright/test';
test('personal queues lead administrator accounts through work and acceptance',async({browser,request})=>{
  const stamp=Date.now(),password='QueuePass123!',accounts=[];
  for(const role of ['owner','worker']){const email=role+stamp+'@example.com';const res=await registerStaff(request,{data:{name:role,email,password}});expect(res.status()).toBe(201);accounts.push({email,...await res.json()});}
  const [owner,worker]=accounts,body={description:'維修測試',location:'2F',category:'OTHER',priority:'LOW'};
  async function create(account,title){const res=await request.post('/api/tickets',{headers:{Authorization:'Bearer '+account.token},data:{...body,title}});expect(res.status()).toBe(201);return res.json();}
  const own=await create(worker,'自己建立 '+stamp),received=await create(owner,'指派工作 '+stamp);
  const assigned=await request.patch('/api/tickets/'+received.id+'/assign',{headers:{Authorization:'Bearer '+owner.token},data:{technicianId:worker.user.id}});expect(assigned.ok()).toBeTruthy();
  const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844}}),browser.newContext()]);const [page,accept]=await Promise.all(contexts.map(c=>c.newPage()));
  async function login(page,account){await page.goto('/system.html?portal=admin');await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('密碼',{exact:true}).fill(password);await page.getByRole('button',{name:'登入',exact:true}).click();await page.getByRole('button',{name:'工單中心',exact:true}).click();}
  try{
    await login(page,worker);await page.getByRole('button',{name:'派給我的',exact:true}).click();await expect(page.getByRole('button',{name:own.title,exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:received.title,exact:true}).filter({visible:true})).toBeVisible();
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'匯出 CSV',exact:true}).click();const file=await download;const stream=await file.createReadStream();let csv='';for await(const chunk of stream)csv+=chunk.toString();expect(csv).toContain(received.ticketNo);expect(csv).not.toContain(own.ticketNo);
    await page.screenshot({path:'test-results/next-step-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'開始維修 '+received.ticketNo,exact:true}).filter({visible:true}).click();await expect(page.getByLabel('維修紀錄',{exact:true})).toBeFocused();await page.getByLabel('維修紀錄',{exact:true}).fill('維修完成');await page.getByLabel('實際工時（小時）',{exact:true}).fill('1');await page.getByRole('button',{name:'提交維修完成',exact:true}).click();await expect(page.locator('.detail-badges')).toContainText('待驗收');await page.getByRole('button',{name:'返回列表',exact:true}).click();
    await page.getByRole('button',{name:'待我處理',exact:true}).click();await expect(page.getByRole('button',{name:received.title,exact:true}).filter({visible:true})).toBeVisible();await expect(page.getByRole('button',{name:own.title,exact:true}).filter({visible:true})).toBeVisible();
    await login(accept,owner);await accept.getByRole('button',{name:'待我處理',exact:true}).click();await accept.getByRole('button',{name:'確認／退回 '+received.ticketNo,exact:true}).filter({visible:true}).click();await expect(accept.getByRole('dialog')).toContainText('維修完成');await accept.getByRole('button',{name:'確認結案',exact:true}).click();await accept.getByRole('button',{name:'返回列表',exact:true}).click();await expect(accept.getByRole('button',{name:received.title,exact:true})).toHaveCount(0);
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});
