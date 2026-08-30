import { test, expect } from '@playwright/test';

test.describe('Phase 1: E2E smoke tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('FundFlow');
    await expect(page.locator('text=From a voice note to a fundable proposal')).toBeVisible();
  });

  test('apply page loads', async ({ page }) => {
    await page.goto('/apply');
    await expect(page.locator('h1')).toContainText('FundFlow Application');
    await expect(page.locator('text=Speak, type, or upload photos')).toBeVisible();
  });

  test('review page loads', async ({ page }) => {
    await page.goto('/review');
    await expect(page.locator('h1')).toContainText('Reviewer Dashboard');
    await expect(page.locator('text=Ranked shortlist with per-criterion reasoning')).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Start Application');
    await expect(page).toHaveURL(/.*apply/);
    
    await page.goto('/');
    await page.click('text=Reviewer Dashboard');
    await expect(page).toHaveURL(/.*review/);
  });
});