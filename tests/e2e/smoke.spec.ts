import { test, expect } from '@playwright/test';

test('homepage renders table with at least one release', async ({ page }) => {
  await page.goto('./?lang=en');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('table.release-table tbody tr')).toHaveCount(15, { timeout: 5000 });
});

test('chip click opens release detail dialog', async ({ page }) => {
  await page.goto('./?lang=en');
  // Use the last chip to avoid the sticky table header covering the first row
  const chip = page.locator('.chip').last();
  await chip.scrollIntoViewIfNeeded();
  await chip.click();
  await expect(page.locator('dialog#release-detail')).toHaveAttribute('open', '');
  await expect(page.locator('.detail-model')).toBeVisible();
  await expect(page).toHaveURL(/#/);
});

test('escape closes the detail dialog and clears hash', async ({ page }) => {
  await page.goto('./?lang=en');
  const chip = page.locator('.chip').last();
  await chip.scrollIntoViewIfNeeded();
  await chip.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog#release-detail')).not.toHaveAttribute('open', '');
  await expect(page).toHaveURL(/^[^#]+$/);
});
