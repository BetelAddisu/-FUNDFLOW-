import { test, expect } from '@playwright/test';

test.describe('Telegram applicant flow', () => {
  test('receives Telegram update and produces same application pack shape', async ({ request }) => {
    const update = {
      message: {
        chat: { id: 123 },
        from: { id: 456 },
        text: 'I want to apply',
        voice: { file_id: 'voice-file-1' },
        photo: [{ file_id: 'photo-small', width: 50, height: 50 }, { file_id: 'photo-large', width: 200, height: 200 }],
      },
    };

    const response = await request.post('/api/telegram/webhook', { data: update });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('applicationPack');
    expect(body.applicationPack).toHaveProperty('gaps');
    expect(body.applicationPack).toHaveProperty('sdgSuggestions');
    expect(body.applicationPack).toHaveProperty('evidence');
  });
});