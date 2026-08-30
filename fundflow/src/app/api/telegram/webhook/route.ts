import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate, TelegramBotFileFetcher } from '@/lib/channels/telegram';
import { sessionService } from '@/lib/session-service';

const fileFetcher = new TelegramBotFileFetcher(process.env.TELEGRAM_BOT_TOKEN || '');

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    
    // Verify webhook secret if configured
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-telegram-bot-api-secret-token');
      if (providedSecret !== webhookSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await handleTelegramUpdate(update, sessionService, fileFetcher);
    
    return NextResponse.json({ success: true, chatId: result.chatId });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}