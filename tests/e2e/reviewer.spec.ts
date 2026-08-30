import { test, expect } from '@playwright/test';

test.describe('Reviewer flow', () => {
  test('loads 12 synthetic applications, shortlist renders at 2× size with synthetic label', async ({ page }) => {
    await page.route('**/api/review/applications', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ranked: Array.from({ length: 12 }, (_, i) => ({
            id: `app-${i + 1}`,
            channel: i % 2 === 0 ? 'web' : 'telegram',
            synthetic: true,
            totalPointsVariantA: 80 - i,
            totalPointsVariantB: 75 - i,
            eligible: true,
          })),
          shortlist: Array.from({ length: 4 }, (_, i) => ({
            id: `app-${i + 1}`,
            synthetic: true,
          })),
          slotsAvailable: 2,
        }),
      });
    });

    await page.goto('/review');

    await expect(page.locator('[data-testid="synthetic-label"]')).toBeVisible();
    await expect(page.locator('[data-testid="shortlist-item"]')).toHaveCount(4);
    await expect(page.locator('[data-testid="ranked-item"]')).toHaveCount(12);
  });
});