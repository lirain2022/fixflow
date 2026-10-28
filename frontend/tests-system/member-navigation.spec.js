import {test,expect} from '@playwright/test';

test('member status shortcuts preserve the search page and work on mobile with keyboard',async({page,request})=>{
 const email=`navigation-${Date.now()}@example.com`,password='Navigation123!';
 const registration=await request.post('/api/auth/register',{data:{name:'查詢測試會員',email,password}});
 expect(registration.status()).toBe(201);const {token}=await registration.json();const headers={Authorization:`Bearer ${token}`};
 for(let i=1;i<=11;i++){
  const response=await request.post('/api/member/tickets',{headers,data:{title:`冷氣檢查 ${i}`,description:'測試篩選與返回位置',location:'客廳',category:'EQUIPMENT',priority:'LOW'}});
  expect(response.status()).toBe(201);
 }
 await page.goto('/member.html?next=tickets');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill(password);
 await page.getByRole('button',{name:'登入',exact:true}).click();
 const summary=page.getByLabel('報修狀態摘要');await expect(summary.getByRole('button',{name:/處理中/})).toContainText('11');
 await summary.getByRole('button',{name:/處理中/}).click();await expect(page.getByRole('combobox',{name:'工單狀態'})).toHaveValue('ACTIVE');
 await page.getByRole('textbox',{name:'搜尋我的工單'}).fill('冷氣檢查');await page.getByRole('button',{name:'搜尋',exact:true}).click();
 await page.getByRole('button',{name:'下一頁'}).click();await expect(page.getByText('共 11 筆 · 第 2 頁',{exact:true})).toBeVisible();
 await page.getByRole('button').filter({has:page.getByRole('heading',{name:'冷氣檢查 1',exact:true})}).click();await expect(page.getByRole('heading',{name:'冷氣檢查 1',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'← 返回我的報修'}).click();await expect(page.getByText('共 11 筆 · 第 2 頁',{exact:true})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'搜尋我的工單'})).toHaveValue('冷氣檢查');
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'test-results/member-navigation-desktop.png',fullPage:true});
 await page.setViewportSize({width:320,height:844});await summary.getByRole('button',{name:/待驗收/}).focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('combobox',{name:'工單狀態'})).toHaveValue('RESOLVED');await expect(page.getByText('目前沒有符合條件的報修工單。')).toBeVisible();
 await expect(summary.getByRole('button',{name:/待驗收/})).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/member-navigation-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'清除篩選'}).click();await expect(page.getByText('共 11 筆 · 第 1 頁',{exact:true})).toBeVisible();
});
