import { test, expect } from '@playwright/test';
const KEY = 'fixflow.tickets.v1';
async function fill(page, title = '飲水機測試專用報修') {
  await page.getByRole('button', { name: '新增工單', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('標題', { exact: true }).fill(title);
  await dialog.getByLabel('問題描述', { exact: true }).fill('按下加熱按鈕沒有反應');
  await dialog.getByLabel('分類', { exact: true }).selectOption('EQUIPMENT');
  await dialog.getByLabel('位置', { exact: true }).fill('二樓茶水間');
  return dialog;
}
test('desktop list, combined search, persistence and safe text rendering', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '工單管理', exact: true })).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(7);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.getByRole('searchbox').fill('會議室');
  await page.getByLabel('工單狀態').selectOption('CLOSED');
  await expect(page.getByText('找不到符合條件的工單')).toBeVisible();
  await page.getByRole('button', { name: '清除篩選' }).click();
  const dialog = await fill(page);
  await page.screenshot({ path: 'test-results/form-desktop.png', fullPage: true });
  await dialog.getByRole('button', { name: '建立工單' }).click();
  await expect(page.getByRole('status')).toContainText('工單已建立');
  await page.reload();
  await page.getByRole('searchbox').fill('飲水機測試專用報修');
  await expect(page.getByRole('row')).toHaveCount(2);
  const dangerous = '<img src=x onerror=alert(1)>';
  const second = await fill(page, dangerous);
  await second.getByRole('button', { name: '建立工單' }).click();
  await expect(page.getByRole('cell').filter({ hasText: dangerous })).toBeVisible();
  expect(await page.locator('img').count()).toBe(0);
  expect(errors).toEqual([]);
});
test('mobile dialog traps focus, handles Escape, validates and cancels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('table')).not.toBeVisible();
  const trigger = page.getByRole('button', { name: '新增工單', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('標題', { exact: true })).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('button', { name: '建立工單' }).click();
  await expect(dialog.getByLabel('標題', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.screenshot({ path: 'test-results/form-mobile.png', fullPage: true });
  await dialog.getByRole('button', { name: '取消' }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).length, KEY)).toBe(6);
});
test('storage failure preserves input without a success message', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  const dialog = await fill(page);
  await dialog.getByRole('button', { name: '建立工單' }).click();
  await expect(dialog.getByRole('alert')).toContainText('無法儲存');
  await expect(dialog.getByLabel('標題', { exact: true })).toHaveValue('飲水機測試專用報修');
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).length, KEY)).toBe(6);
});
test('damaged storage is preserved until the user resets', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken'), KEY);
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('資料格式損毀');
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{broken');
  await page.getByRole('button', { name: '重設展示資料' }).click();
  await expect(page.getByRole('row')).toHaveCount(7);
});
