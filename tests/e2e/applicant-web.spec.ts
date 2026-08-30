import { test, expect } from '@playwright/test';

test.describe('Web applicant flow', () => {
  test('submits voice note in English, Amharic, and Oromifa', async ({ page }) => {
    const languages = [
      { name: 'english', file: 'sample-voice-en.mp3', expectedText: 'English transcription' },
      { name: 'amharic', file: 'sample-voice-am.mp3', expectedText: 'Amharic transcription' },
      { name: 'oromifa', file: 'sample-voice-om.mp3', expectedText: 'Oromifa transcription' },
    ];

    for (const lang of languages) {
      await page.route('**/api/chat', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            text: lang.expectedText,
            language: lang.name,
          }),
        });
      });

      await page.goto('/apply');
      await page.setInputFiles('input[name="audio"]', `tests/fixtures/${lang.file}`);
      await page.click('button[type="submit"]');

      await expect(page.locator('[data-testid="response-text"]')).toContainText(lang.expectedText);
    }
  });

  test('uploads voice note + photos → application pack renders with gaps and SDG suggestions', async ({ page }) => {
    await page.route('**/api/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'Thank you, your application is complete.',
          gaps: [
            { field: 'company_profile.business_registration_number', message: 'Field missing', action: 'Ask applicant...' },
          ],
          sdgSuggestions: [
            { sdgId: 7, title: 'Affordable and Clean Energy', reason: 'Solar sector', evidenceSource: 'business_type', alignmentStatus: 'potential_alignment' },
          ],
        }),
      });
    });

    await page.goto('/apply');

    await page.setInputFiles('input[name="audio"]', 'tests/fixtures/sample-voice-en.mp3');
    await page.setInputFiles('input[name="photos"]', 'tests/fixtures/sample-license.jpg');
    await page.fill('textarea[name="text"]', 'I want to apply');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="gap-list"]')).toContainText('business_registration_number');
    await expect(page.locator('[data-testid="sdg-suggestion"]')).toContainText('Affordable and Clean Energy');
  });
});