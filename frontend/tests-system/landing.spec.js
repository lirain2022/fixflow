import {test,expect} from '@playwright/test';
test('full report survives reload and login before real submission',async({page})=>{
 await page.goto('/repair.html?service=network');
 const title='網站報修 '+Date.now();
 await page.getByLabel('問題標題').fill(title);
 await page.getByLabel('問題描述').fill('Wi-Fi 持續斷線，無法連接');
 await page.getByLabel('報修位置').fill('總部 2F');
 await page.getByLabel('優先級').selectOption('HIGH');
 await page.reload();
 await expect(page.getByLabel('問題標題')).toHaveValue(title);
 await expect(page.getByLabel('問題分類')).toHaveValue('NETWORK');
 await page.getByRole('button',{name:'下一步：確認報修'}).click();
 await expect(page).toHaveURL(/system.html\?action=new$/);
 await page.getByLabel('Email',{exact:true}).fill('customer@fixflow.local');
 await page.getByLabel('密碼',{exact:true}).fill('FixFlow123!');
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page.getByLabel('問題標題')).toHaveValue(title);
 await expect(page.getByLabel('問題描述')).toHaveValue('Wi-Fi 持續斷線，無法連接');
 await expect(page.getByLabel('報修位置')).toHaveValue('總部 2F');
 if(await page.getByRole('button',{name:'恢復草稿',exact:true}).isVisible())await page.getByRole('button',{name:'恢復草稿',exact:true}).click();
 const response=page.waitForResponse(r=>r.url().endsWith('/api/tickets')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'送出報修',exact:true}).click();
 const saved=await response;expect(saved.ok()).toBe(true);
 const ticket=await saved.json();expect(ticket.title).toBe(title);expect(ticket.category).toBe('NETWORK');expect(ticket.priority).toBe('HIGH');
 await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('desktop menu, separate process and interactive core',async({page})=>{
 await page.goto('/');
 await expect(page.locator('canvas')).toBeVisible();
 await page.getByRole('button',{name:'點亮維修核心'}).click();
 await page.getByRole('button',{name:'暫停 3D'}).click();
 await expect(page.locator('canvas')).toHaveCount(0);
 await page.getByRole('button',{name:'播放 3D'}).click();
 await expect(page.locator('canvas')).toBeVisible();
 const menu=page.getByRole('button',{name:'服務項目'});await menu.click();
 await expect(page.locator('#service-dropdown')).toBeVisible();
 await page.keyboard.press('Escape');await expect(menu).toBeFocused();
 await page.getByRole('link',{name:'維修流程',exact:true}).first().click();
 await expect(page).toHaveURL(/process.html$/);await page.reload();
 await expect(page.locator('.journey-steps > li')).toHaveCount(5);
 await page.screenshot({path:'test-results/process-desktop.png',fullPage:true});
});
test('mobile menu and forms fit narrow screens with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [320,390]){
 await page.setViewportSize({width,height:844});await page.goto('/');
 await expect(page.locator('canvas')).toHaveCount(0);
 await page.getByRole('button',{name:'開啟導覽'}).click();
 await page.getByRole('button',{name:'服務項目'}).click();
 await page.locator('#service-dropdown').getByRole('link').filter({hasText:'網路系統'}).click();
 await expect(page.getByLabel('問題分類')).toHaveValue('NETWORK');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/repair-mobile-'+width+'.png',fullPage:true});
 await page.goto('/process.html');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});

test('progress shortcut resumes after member login and selects created tickets',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:'查詢維修進度',exact:true}).first().click();
 await expect(page).toHaveURL(/system.html\?view=tickets$/);
 await page.getByLabel('Email',{exact:true}).fill('customer@fixflow.local');
 await page.getByLabel('密碼',{exact:true}).fill('FixFlow123!');
 await page.getByRole('button',{name:'登入',exact:true}).click();
 await expect(page.getByRole('heading',{name:'我的工單',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'我建立的',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.reload();await expect(page.getByRole('heading',{name:'我的工單',exact:true})).toBeVisible();
});

test('fees and FAQs are readable and keyboard accessible on mobile',async({page})=>{
 await page.setViewportSize({width:320,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#fees');await expect(page.getByRole('heading',{name:'人工費',exact:true})).toBeInViewport();
 await expect(page.getByRole('link',{name:'查看我的工單費用'})).toHaveAttribute('href','/system.html?view=tickets');
 const question=page.locator('summary').filter({hasText:'費用在哪裡看？'});
 await question.focus();await page.keyboard.press('Enter');
 await expect(question.locator('..')).toHaveAttribute('open','');
 await expect(question.locator('..').locator('p')).toContainText('尚未登錄費用不代表免費');
 await page.keyboard.press('Enter');await expect(question.locator('..')).not.toHaveAttribute('open','');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/home-support-mobile.png',fullPage:true});
});
