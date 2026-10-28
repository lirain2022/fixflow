import {registerStaff} from './staff-fixture';
import {test,expect} from '@playwright/test';
test('cost overview links tickets, exports visible costs and fits mobile',async({page,request})=>{
 const stamp=Date.now(),email='overview-'+stamp+'@example.com',password='FixFlow123!';
 const registered=await registerStaff(request,{data:{name:'費用測試',email,password}});expect(registered.status()).toBe(201);const session=await registered.json();
 const headers={Authorization:'Bearer '+session.token};
 const created=await request.post('/api/tickets',{headers,data:{title:'費用總覽測試',description:'冷氣維修',category:'OTHER',location:'三樓',priority:'LOW'}});expect(created.status()).toBe(201);const ticket=await created.json(),base='/api/tickets/'+ticket.id;
 expect((await request.patch(base+'/assign',{headers,data:{technicianId:session.user.id}})).status()).toBe(200);
 const started=await (await request.patch(base+'/status',{headers,data:{status:'IN_PROGRESS'}})).json();
 expect((await request.post(base+'/repair-records',{headers,data:{description:'更換接頭完成',workHours:'1',laborCost:'125',parts:[],version:started.version}})).status()).toBe(201);
 await page.goto('/system.html?portal=admin');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill(password);await page.getByRole('button',{name:'登入',exact:true}).click();
 await page.getByRole('button',{name:'費用總覽',exact:true}).click();await page.getByRole('combobox',{name:'目前負責人',exact:true}).selectOption(String(session.user.id));await page.getByRole('button',{name:'套用篩選',exact:true}).click();await expect(page.getByLabel('費用摘要')).toContainText('125');
 await page.getByRole('button',{name:'查看工單',exact:true}).click();await expect(page.getByRole('dialog',{name:'工單詳細資訊'})).toContainText('費用總覽測試');await page.getByRole('button',{name:'返回列表',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'匯出 CSV',exact:true}).click();expect((await download).suggestedFilename()).toBe('fixflow-costs.csv');
 await page.getByRole('button',{name:'未連結設備',exact:true}).click();await expect(page.getByRole('button',{name:'開啟處理',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/cost-overview-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.cost-panel .table-wrap').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await expect(page.getByRole('button',{name:'開啟處理',exact:true})).toBeVisible();await page.screenshot({path:'test-results/cost-overview-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'開啟處理',exact:true}).click();await expect(page.getByRole('dialog',{name:'工單詳細資訊'})).toContainText('費用總覽測試');await page.getByRole('button',{name:'返回列表',exact:true}).click();await expect(page.getByRole('button',{name:'未連結設備',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'未登錄費用',exact:true}).click();await expect(page.getByText('目前沒有符合條件的資料')).toBeVisible();
});
