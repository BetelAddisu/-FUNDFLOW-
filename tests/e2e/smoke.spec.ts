import { test, expect } from '@playwright/test';

test('app boots and home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('FundFlow');
});