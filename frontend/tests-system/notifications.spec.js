import {test,expect} from '@playwright/test';

test('assignment and repair notifications reach the correct roles and read state persists on mobile',async({browser,request})=>{
  const stamp=Date.now(),email=`notify-owner-${stamp}@example.com`,techEmail=`notify-tech-${stamp}@example.com`,password='FixFlow123!';
  const admin=(await (await request.post('/api/auth/login',{data:{email:'admin@fixflow.local',password}})).json()).token;
  const registration=await request.post('/api/auth/register',{data:{name:'通知報修者',email,password}});expect(registration.status()).toBe(201);const ownerToken=(await registration.json()).token;
  const staff=await request.post('/api/users',{headers:{Authorization:`Bearer ${admin}`},data:{name:'通知技師',email:techEmail,password,role:'TECHNICIAN'}});expect(staff.status()).toBe(201);const techId=(await staff.json()).id;
  const techToken=(await (await request.post('/api/auth/login',{data:{email:techEmail,password}})).json()).token;
  const title=`通知維修 ${stamp}`;const created=await request.post('/api/tickets',{headers:{Authorization:`Bearer ${ownerToken}`},data:{title,description:'Check notifications',location:'3F',category:'OTHER',priority:'LOW'}});expect(created.status()).toBe(201);const ticket=await created.json();
  expect((await request.patch(`/api/tickets/${ticket.id}/assign`,{headers:{Authorization:`Bearer ${admin}`},data:{technicianId:techId}})).status()).toBe(200);
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);const [owner,tech]=await Promise.all(contexts.map(c=>c.newPage()));
  const open=async(page,account)=>{await page.goto('/system.html');await page.getByLabel('Email',{exact:true}).fill(account);await page.getByLabel('密碼',{exact:true}).fill(password);await page.getByRole('button',{name:'登入',exact:true}).click();await page.getByRole('button',{name:/^通知中心/}).click();await expect(page.getByRole('heading',{name:'通知中心',exact:true})).toBeVisible();};
  try{
    await open(tech,techEmail);await expect(tech.locator('.notification-list')).toContainText(title);await tech.getByRole('button',{name:/^開啟通知/}).click();await expect(tech.locator('.detail-title')).toHaveText(title);
    await tech.getByRole('button',{name:'開始維修',exact:true}).click();await tech.getByRole('button',{name:'返回列表'}).click();
    expect((await request.post(`/api/tickets/${ticket.id}/repair-records`,{headers:{Authorization:`Bearer ${techToken}`},data:{description:'Repair completed'}})).status()).toBe(201);
    await open(owner,email);await expect(owner.locator('.notification-list')).toContainText('維修已完成，請查看紀錄並確認驗收');await expect(owner.getByRole('button',{name:'通知中心，3 則未讀'})).toBeVisible();
    await owner.setViewportSize({width:390,height:844});expect(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await owner.screenshot({path:'test-results/notifications-mobile.png',fullPage:true});
    await owner.getByRole('button',{name:'全部標為已讀'}).click();await expect(owner.getByRole('button',{name:'通知中心，0 則未讀'})).toBeVisible();await owner.reload();await owner.getByRole('button',{name:'通知中心，0 則未讀'}).click();await owner.getByRole('checkbox',{name:'只看未讀'}).check();await expect(owner.getByRole('heading',{name:'目前沒有未讀通知'})).toBeVisible();
    await owner.getByRole('checkbox',{name:'只看未讀'}).uncheck();await owner.getByRole('button',{name:/^開啟通知/}).first().click();await expect(owner.locator('.detail-badges')).toContainText('待確認');await expect(owner.getByRole('dialog')).toContainText('Repair completed');
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});
