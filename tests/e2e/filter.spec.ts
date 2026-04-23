import { test, expect } from '@playwright/test';

test('deselecting a vendor hides its column', async ({ page }) => {
  await page.goto('./?lang=en');
  const vendorHeader = page.locator('th.col-vendor[data-vendor="openai"]');
  await expect(vendorHeader).toBeVisible();
  await page.locator('.pill[data-vendor="openai"]').click();
  await expect(vendorHeader).toBeHidden();
  await expect(page).toHaveURL(/vendors=/);
});

test('period button reloads with matching query', async ({ page }) => {
  await page.goto('./?lang=en');
  await page.locator('.period-btn[data-v="all"]').click();
  await page.waitForURL(/period=all/);
  await expect(page.locator('table.release-table tbody tr').first()).toBeVisible();
});
