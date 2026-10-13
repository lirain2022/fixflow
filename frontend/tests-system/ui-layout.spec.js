import {test,expect} from '@playwright/test';

test('actions stay in their panels and form footers remain reachable on desktop and mobile',async({page})=>{
 await page.goto('/system.html');await page.getByLabel('Email',{exact:true}).fill('customer@fixflow.local');await page.getByLabel('密碼',{exact:true}).fill('FixFlow123!');await page.getByRole('button',{name:'登入',exact:true}).click();
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
