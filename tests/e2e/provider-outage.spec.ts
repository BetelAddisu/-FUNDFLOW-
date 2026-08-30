import { test, expect } from '@playwright/test';

test.describe('Provider outage handling', () => {
  test('voice provider failure shows graceful message and preserves session state', async ({ page }) => {
    await page.route('**/api/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'Sorry, we could not transcribe your audio. Please try again or type your response.',
          sessionStatePreserved: true,
        }),
      });
    });

    await page.goto('/apply');
    await page.setInputFiles('input[name="audio"]', {
      name: 'sample-voice.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio'),
    });
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText('could not transcribe');
    await expect(page.locator('textarea[name="text"]')).toBeVisible();
  });

  test('reasoning provider failure shows graceful message and preserves session state', async ({ page }) => {
    await page.route('**/api/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'We are experiencing technical difficulties. Please try again in a moment.',
          sessionStatePreserved: true,
        }),
      });
    });

    await page.goto('/apply');
    await page.fill('textarea[name="text"]', 'Tell me about my business');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText('technical difficulties');
    await expect(page.locator('textarea[name="text"]')).toBeVisible();
  });
});