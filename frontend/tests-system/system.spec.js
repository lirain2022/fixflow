import {test,expect} from '@playwright/test';
async function login(page,email){await page.goto('/system.html?portal=admin');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill('FixFlow123!');await page.getByRole('button',{name:'登入',exact:true}).click();await expect(page.getByRole('button',{name:'登出',exact:true})).toBeVisible();await page.getByRole('button',{name:'工單中心',exact:true}).click();}
test('administrators complete a persisted repair workflow',async({browser})=>{
  const contexts=await Promise.all([browser.newContext(),browser.newContext(),browser.newContext()]);
  const [customer,admin,tech]=await Promise.all(contexts.map(c=>c.newPage()));
  const title=`瀏覽器驗收 ${Date.now()}`;
  try{
    await login(customer,'admin@fixflow.local');
    await customer.getByRole('button',{name:'新增工單',exact:true}).click();
    await customer.getByLabel('問題標題').fill(title);await customer.getByLabel('問題描述').fill('三樓冷氣漏水\n請安排檢查');await customer.getByLabel('報修位置').fill('3F 會議室');
    await customer.getByRole('button',{name:'送出報修'}).click();
    await expect(customer.getByRole('dialog')).toContainText(title);
    await customer.locator('summary').filter({hasText:'留言討論'}).click();await customer.getByLabel('新增留言').fill('請於下午協助');await customer.getByRole('button',{name:'送出留言'}).click();await expect(customer.locator('.timeline-entry')).toContainText('請於下午協助');
    await customer.getByRole('button',{name:'返回列表'}).click();await customer.reload();await customer.getByRole('button',{name:'工單中心',exact:true}).click();await expect(customer.getByRole('button',{name:title,exact:true}).first()).toBeVisible();
    await login(admin,'admin@fixflow.local');await admin.getByRole('button',{name:title,exact:true}).first().click();await admin.getByLabel('指派人員').selectOption({label:'管理員 (admin@fixflow.local)'});await admin.getByRole('button',{name:'確認派工'}).click();await expect(admin.locator('.detail-badges')).toContainText('已派工');await admin.getByRole('button',{name:'返回列表'}).click();
    await login(tech,'admin@fixflow.local');await tech.getByRole('button',{name:title,exact:true}).first().click();await tech.getByRole('dialog').getByRole('button',{name:'開始維修',exact:true}).click();await tech.getByLabel('維修紀錄',{exact:true}).fill('清理排水管，測試正常');await tech.getByLabel('實際工時（小時）',{exact:true}).fill('1');await tech.getByRole('button',{name:'提交維修完成'}).click();await expect(tech.locator('.detail-badges')).toContainText('待驗收');
    await customer.getByRole('button',{name:'重新整理',exact:true}).click();await customer.getByRole('button',{name:title,exact:true}).first().click();await customer.getByRole('button',{name:'確認結案'}).click();await expect(customer.locator('.detail-badges')).toContainText('已結案');await expect(customer.getByRole('dialog')).toContainText('清理排水管，測試正常');
    await customer.screenshot({path:'test-results/system-workflow.png',fullPage:true});
    await admin.getByRole('button',{name:'工作總覽',exact:true}).click();await expect(admin.getByRole('heading',{name:'工作總覽'})).toBeVisible();await expect(admin.locator('.metric-card')).toHaveCount(6);
    await admin.getByRole('button',{name:'帳號管理',exact:true}).click();await expect(admin.getByRole('heading',{name:'建立新帳號'})).toBeVisible();
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});
test('mobile member registration, report validation and login persistence',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/member.html');
 await page.getByRole('button',{name:'第一次使用？建立會員帳號'}).click();await page.getByLabel('姓名',{exact:true}).fill('手機測試');await page.getByLabel('Email',{exact:true}).fill('mobile-'+Date.now()+'@example.com');await page.getByLabel('密碼',{exact:true}).fill('MobilePass123!');await page.getByRole('button',{name:'建立帳號',exact:true}).click();
 await expect(page.getByRole('heading',{name:'我的報修',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'我的報修',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'帳號管理'})).toHaveCount(0);
 await page.getByRole('button',{name:'＋ 新增報修',exact:true}).click();await page.getByLabel('問題標題').fill('手機報修');await page.getByLabel('問題描述').fill('照明故障');await page.getByLabel('報修位置').fill('2F');await page.getByRole('button',{name:'送出報修'}).click();await expect(page.getByRole('heading',{name:'手機報修',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/member-report-mobile.png',fullPage:true});await page.getByRole('button',{name:'登出',exact:true}).last().click();await expect(page).toHaveURL(/\/$/);await page.goto('/member.html');await expect(page.getByRole('heading',{name:'會員登入',exact:true})).toBeVisible();
});
