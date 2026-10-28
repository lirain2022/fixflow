import {test,expect} from '@playwright/test';
async function submit(page,email){await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill('FixFlow123!');await page.getByRole('button',{name:'登入',exact:true}).click();}
test('admin entrance rejects members and does not reuse a member session',async({page})=>{
 await page.goto('/');await expect(page.locator('nav').getByRole('link',{name:'會員登入',exact:true})).toHaveAttribute('href','/member.html?screen=login');await expect(page.locator('nav').getByRole('link',{name:'管理員登入',exact:true})).toHaveAttribute('href','/system.html?portal=admin');await page.locator('nav').getByRole('link',{name:'管理員登入',exact:true}).click();
 await expect(page.getByRole('heading',{name:'管理員登入',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'第一次使用？建立報修帳號'})).toHaveCount(0);
 await submit(page,'customer@fixflow.local');await expect(page.getByRole('alert')).toContainText('不是管理員');
 await submit(page,'admin@fixflow.local');await expect(page.getByRole('button',{name:'帳號管理',exact:true})).toBeVisible();
 await page.goto('/system.html');await expect(page.getByRole('heading',{name:'會員登入'})).toBeVisible();
 await submit(page,'admin@fixflow.local');await expect(page.getByRole('alert')).toContainText('請使用管理員登入');
 await submit(page,'customer@fixflow.local');await expect(page).toHaveURL(/\/$/);await page.getByRole('link',{name:'會員中心',exact:true}).click();await expect(page.getByRole('heading',{name:'我的報修',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'帳號管理',exact:true})).toHaveCount(0);
 await page.goto('/system.html?portal=admin');await expect(page.getByRole('button',{name:'帳號管理',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'登出',exact:true}).click();await expect(page.getByRole('heading',{name:'管理員登入'})).toBeVisible();
 await page.goto('/member.html');await expect(page.getByRole('heading',{name:'我的報修',exact:true})).toBeVisible();
});
