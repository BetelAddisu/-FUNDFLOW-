/**
 * Telegram Bot API client — thin wrapper around the Bot API.
 * Only server-side; TELEGRAM_BOT_TOKEN is never exposed to the browser.
 */

const BASE = 'https://api.telegram.org';

function botUrl(token: string, method: string): string {
  return `${BASE}/bot${token}/${method}`;
}

export interface SendMessageOptions {
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  reply_markup?: unknown;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options: SendMessageOptions = {}
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[telegram-client] TELEGRAM_BOT_TOKEN not set — skipping sendMessage');
    return;
  }

  const body = {
    chat_id: chatId,
    text: text.slice(0, 4096), // Telegram max message length
    ...options,
  };

  const res = await fetch(botUrl(token, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[telegram-client] sendMessage failed:', res.status, err);
  }
}

export async function getTelegramFileBuffer(fileId: string): Promise<Buffer> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');

  // Step 1: get file path
  const fileRes = await fetch(botUrl(token, 'getFile'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!fileRes.ok) throw new Error(`getFile failed: ${fileRes.status}`);

  const fileData = await fileRes.json();
  const filePath: string = fileData.result?.file_path;
  if (!filePath) throw new Error('No file_path in getFile response');

  // Step 2: download the file
  const downloadUrl = `${BASE}/file/bot${token}/${filePath}`;
  const downloadRes = await fetch(downloadUrl);
  if (!downloadRes.ok) throw new Error(`File download failed: ${downloadRes.status}`);

  const arrayBuffer = await downloadRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
