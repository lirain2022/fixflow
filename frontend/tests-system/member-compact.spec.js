import {test,expect} from '@playwright/test';
test('compact progress keeps details accessible and parts lookup opens the owning report',async({page,request})=>{
 const email=`compact-${Date.now()}@example.com`;
 const registration=await request.post('/api/auth/register',{data:{name:'查詢會員',email,password:'Compact123!'}});
 expect(registration.status()).toBe(201);const {token}=await registration.json();const headers={Authorization:`Bearer ${token}`};
 for(const title of ['冷氣異常聲音','設備問題說明'.repeat(12),'筆電無法開機']){
  const result=await request.post('/api/member/tickets',{headers,data:{title,description:'按下電源沒有反應，需要協助檢查。',location:'台北辦公室',category:'EQUIPMENT',priority:'MEDIUM',partRequests:[{name:'SSD 1TB',quantity:1,purpose:'升級儲存空間',referenceUrl:''}]}});
  expect(result.status()).toBe(201);
 }
 await page.addInitScript(token=>sessionStorage.setItem('fixflow.session.v1',JSON.stringify({token})),token);
 await page.goto('/member.html?next=tickets');
 await expect(page.getByRole('heading',{name:'我的報修',exact:true})).toBeVisible();
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',320,844]]){
  await page.setViewportSize({width,height});
  expect(await page.locator('.member-ticket').first().evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(130);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'});});
  await page.screenshot({path:`test-results/compact-list-${name}.png`,fullPage:true});
 }
 await page.getByRole('button').filter({has:page.getByRole('heading',{name:'筆電無法開機',exact:true})}).click();
 await expect(page.getByRole('heading',{name:'筆電無法開機',exact:true})).toBeVisible();
 await expect(page.getByLabel('報修狀態摘要')).toHaveCount(0);
 await expect(page.locator('.member-disclosure[open]')).toHaveCount(0);
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',320,844]]){
  await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`test-results/compact-detail-${name}.png`,fullPage:true});
 }
 const parts=page.locator('summary').filter({hasText:/^零件需求$/});await parts.focus();await page.keyboard.press('Enter');
 await expect(page.getByText('SSD 1TB × 1',{exact:true})).toBeVisible();
 await expect(page.getByLabel('零件名稱',{exact:true})).toBeHidden();
 await page.getByText('補充零件需求',{exact:true}).click();await page.getByLabel('零件名稱',{exact:true}).fill('記憶體');
 await page.getByText('補充零件需求',{exact:true}).click();await page.getByText('補充零件需求',{exact:true}).click();await expect(page.getByLabel('零件名稱',{exact:true})).toHaveValue('記憶體');
 await page.getByRole('button',{name:'← 返回我的報修',exact:true}).click();await page.getByRole('button',{name:'零件需求',exact:true}).click();
 await expect(page.getByText('升級儲存空間',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/SSD 1TB/}).first().click();await expect(page.getByText('SSD 1TB × 1',{exact:true})).toBeVisible();
});
