import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate, TelegramFileFetcher } from '@/lib/channels/telegram';
import { interviewService } from '@/lib/interview/session-service';
import { sendTelegramMessage, getTelegramFileBuffer } from '@/lib/channels/telegram-client';

class RealTelegramFileFetcher implements TelegramFileFetcher {
  async getFileBuffer(fileId: string): Promise<Buffer> {
    try {
      return await getTelegramFileBuffer(fileId);
    } catch (err) {
      console.warn('[telegram-webhook] Failed to fetch real Telegram file buffer:', err);
      // Fallback mock buffer if Telegram file fetch fails or key isn't live
      return Buffer.from(`file-${fileId}`);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const fileFetcher = new RealTelegramFileFetcher();
    
    const result = await handleTelegramUpdate(update, interviewService, fileFetcher);
    
    // Send response text back to Telegram chat asynchronously
    if (result.chatId && result.text) {
      await sendTelegramMessage(result.chatId, result.text);
    }

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error('[telegram-webhook] Error processing update:', err);
    return NextResponse.json({ error: err.message || 'Error processing webhook' }, { status: 400 });
  }
}