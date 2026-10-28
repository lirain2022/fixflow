import {registerStaff} from './staff-fixture';
import {test,expect} from '@playwright/test';

test('actions stay in their panels and form footers remain reachable on desktop and mobile',async({page})=>{
 await page.goto('/system.html?portal=admin');await page.getByLabel('Email',{exact:true}).fill('admin@fixflow.local');await page.getByLabel('密碼',{exact:true}).fill('FixFlow123!');await page.getByRole('button',{name:'登入',exact:true}).click();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:844});
  await page.getByRole('button',{name:'設備管理',exact:true}).click();await expect(page.getByLabel('搜尋設備資料')).toBeVisible();await expect(page.getByLabel('搜尋未連結工單')).not.toBeVisible();
  await page.getByRole('button',{name:'未連結工單與費用',exact:true}).click();await expect(page.getByLabel('搜尋未連結工單')).toBeVisible();await expect(page.getByLabel('搜尋設備資料')).not.toBeVisible();
  await page.getByRole('button',{name:'設備列表',exact:true}).click();await page.screenshot({path:`test-results/ui-equipment-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'新增設備',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  const footer=dialog.locator('.dialog-actions');const bounds=await footer.boundingBox();expect(bounds.y+bounds.height).toBeLessThanOrEqual(844);expect(bounds.y).toBeGreaterThan(0);
  await dialog.locator('.form-fields').evaluate(el=>{el.scrollTop=el.scrollHeight;});await expect(page.getByRole('button',{name:'儲存設備',exact:true})).toBeInViewport();await page.screenshot({path:`test-results/ui-form-${width}.png`});
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('button',{name:'派工中心',exact:true}).click();await expect(page.locator('.dispatch-layout')).toBeVisible();await expect(page.locator('.dispatch-people')).toHaveCount(0);await expect(page.locator('.dispatch-confirm')).toHaveCount(0);
  await page.screenshot({path:`test-results/ui-dispatch-${width}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});


test('protects unsaved costs across close, Escape and previous step on mobile',async({page,request})=>{
 const email=`guard-${Date.now()}@example.com`,password='FixFlow123!';const registration=await registerStaff(request,{data:{name:'費用保護測試',email,password}});expect(registration.status()).toBe(201);const auth=await registration.json(),headers={Authorization:`Bearer ${auth.token}`};
 const created=await request.post('/api/tickets',{headers,data:{title:'費用防遺失測試',description:'測試',location:'測試室',category:'OTHER',priority:'LOW'}});expect(created.status()).toBe(201);const ticket=await created.json();
 expect((await request.patch(`/api/tickets/${ticket.id}/assign`,{headers,data:{technicianId:auth.user.id}})).ok()).toBeTruthy();expect((await request.patch(`/api/tickets/${ticket.id}/status`,{headers,data:{status:'IN_PROGRESS'}})).ok()).toBeTruthy();
 await page.goto('/system.html?portal=admin');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill(password);await page.getByRole('button',{name:'登入',exact:true}).click();await page.getByRole('button',{name:'工單中心',exact:true}).click();await page.getByRole('button',{name:ticket.title,exact:true}).first().click();
 await expect(page.getByRole('region',{name:'工單摘要'})).toBeVisible();await expect(page.getByLabel('新增留言',{exact:true})).not.toBeVisible();await expect(page.getByLabel('新增照片',{exact:true})).not.toBeVisible();
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'test-results/detail-organized-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/detail-organized-mobile.png'});expect(await page.getByRole('dialog',{name:'工單詳細資訊'}).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.locator('summary').filter({hasText:'留言討論'}).click();await page.getByLabel('新增留言',{exact:true}).fill('確認收合後仍可留言');await page.getByRole('button',{name:'送出留言',exact:true}).click();await expect(page.locator('.timeline-entry').filter({hasText:'確認收合後仍可留言'})).toBeVisible();await page.locator('summary').filter({hasText:'留言討論'}).click();
 await page.getByLabel('人工費（NT$）',{exact:true}).fill('125');await page.getByRole('button',{name:'關閉視窗',exact:true}).click();const guard=page.getByRole('dialog',{name:'尚有未儲存的維修費用'});await expect(guard).toBeVisible();await page.getByRole('button',{name:'繼續編輯',exact:true}).click();await expect(page.getByLabel('人工費（NT$）',{exact:true})).toHaveValue('125');
 await page.setViewportSize({width:390,height:844});await page.keyboard.press('Escape');await expect(guard).toBeVisible();await page.screenshot({path:'test-results/repair-leave-guard-mobile.png'});expect(await guard.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.route('**/api/tickets/*/repair-draft',route=>route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({message:'工單已更新，請重新確認'})}));await page.getByRole('button',{name:'儲存草稿後繼續'}).click();await expect(guard).not.toBeVisible();await expect(page.getByRole('dialog',{name:'工單詳細資訊'})).toBeVisible();await expect(page.getByLabel('人工費（NT$）',{exact:true})).toHaveValue('125');await page.unroute('**/api/tickets/*/repair-draft');
 await page.getByRole('button',{name:'上一步',exact:true}).click();await expect(guard).toBeVisible();await page.getByRole('button',{name:'儲存草稿後繼續'}).click();await expect(page.locator('.detail-badges')).toContainText('已派工');await expect(page.getByLabel('維修費用',{exact:true})).toContainText('NT$ 125.00');await page.getByRole('button',{name:'返回列表',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
