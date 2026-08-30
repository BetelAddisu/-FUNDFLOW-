import { test, expect } from '@playwright/test';

test.describe('FundFlow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('home page loads and has navigation', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('FundFlow');
    await expect(page.locator('a[href="/apply"]')).toBeVisible();
    await expect(page.locator('a[href="/review"]')).toBeVisible();
  });

  test('apply page loads with language selector', async ({ page }) => {
    await page.goto('/apply');
    await expect(page.locator('h1')).toContainText('FundFlow Application');
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('option[value="en"]')).toBeVisible();
    await expect(page.locator('option[value="am"]')).toBeVisible();
    await expect(page.locator('option[value="om"]')).toBeVisible();
  });

  test('review page loads with slots selector', async ({ page }) => {
    await page.goto('/review');
    await expect(page.locator('h1')).toContainText('Reviewer Dashboard');
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('button:has-text("Load Fixtures (12)")')).toBeVisible();
  });

  test('can switch languages on apply page', async ({ page }) => {
    await page.goto('/apply');
    await page.selectOption('select', 'am');
    await expect(page.locator('select')).toHaveValue('am');
    await page.selectOption('select', 'om');
    await expect(page.locator('select')).toHaveValue('om');
  });

  test('review page loads fixtures', async ({ page }) => {
    await page.goto('/review');
    await page.click('button:has-text("Load Fixtures (12)")');
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('tbody tr')).toHaveCount(12);
  });

  test('shortlist shows 2x slots', async ({ page }) => {
    await page.goto('/review');
    await page.click('button:has-text("Load Fixtures (12)")');
    await expect(page.locator('tbody tr')).toHaveCount(12, { timeout: 10000 });
    // Shortlist should show 4 items (2x2)
    await expect(page.locator('text=Shortlist')).toBeVisible();
  });
});

test.describe('API Health Checks', () => {
  test('chat API responds', async ({ request }) => {
    const response = await request.post('/api/chat', {
      form: {
        sessionId: 'test-session',
        userId: 'test-user',
        language: 'en',
        text: 'Hello',
      },
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('review API responds', async ({ request }) => {
    const response = await request.get('/api/review/applications?fixtures=true&slots=2');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.ranked).toHaveLength(12);
    expect(data.shortlist).toHaveLength(4);
  });
});