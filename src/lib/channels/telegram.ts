import { ChannelInput, ChannelResponse, InterviewSessionService, TelegramFileFetcher, TelegramUpdate } from './types';
import { createServerSupabaseClient } from '../supabase';
import { getVoiceProvider } from '../ai/providers';

export class TelegramBotFileFetcher implements TelegramFileFetcher {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  async getFileBuffer(fileId: string): Promise<Buffer> {
    const fileUrl = await this.getFileUrl(fileId);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async getFileUrl(fileId: string): Promise<string> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`
    );
    if (!response.ok) {
      throw new Error(`Failed to get file info: ${response.status}`);
    }
    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }
    return `https://api.telegram.org/file/bot${this.botToken}/${data.result.file_path}`;
  }
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  service: InterviewSessionService,
  fileFetcher: TelegramFileFetcher
): Promise<ChannelResponse & { chatId: number }> {
  const message = update.message;
  if (!message) {
    throw new Error('No message in update');
  }

  const chatId = message.chat.id;
  const userId = String(message.from?.id ?? chatId);
  const language = mapLanguageCode(message.from?.language_code) || 'en';

  let input: ChannelInput['input'];

  if (message.voice) {
    const audioBuffer = await fileFetcher.getFileBuffer(message.voice.file_id);
    input = {
      type: 'voice',
      audioBuffer,
      durationSec: message.voice.duration,
    };
  } else if (message.photo && message.photo.length > 0) {
    // Get the largest photo
    const largestPhoto = message.photo.reduce((prev, curr) =>
      curr.file_size > prev.file_size ? curr : prev
    );
    const imageBuffer = await fileFetcher.getFileBuffer(largestPhoto.file_id);
    input = {
      type: 'photo',
      imageBuffer,
      caption: message.caption,
    };
  } else if (message.text) {
    input = {
      type: 'text',
      content: message.text,
    };
  } else {
    throw new Error('Unsupported message type');
  }

  const sessionId = `telegram-${chatId}`;

  const channelInput: ChannelInput = {
    sessionId,
    channel: 'telegram',
    userId,
    language,
    input,
    timestamp: new Date().toISOString(),
  };

  const response = await service.process(channelInput);

  // Send response back to Telegram
  await sendTelegramResponse(chatId, response, fileFetcher);

  return { ...response, chatId };
}

function mapLanguageCode(code?: string): 'en' | 'am' | 'om' | null {
  if (!code) return null;
  if (code.startsWith('am')) return 'am';
  if (code.startsWith('om')) return 'om';
  return 'en';
}

async function sendTelegramResponse(
  chatId: number,
  response: ChannelResponse,
  fileFetcher: TelegramFileFetcher
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not set, cannot send response');
    return;
  }

  try {
    if (response.audioBuffer) {
      // Send voice note
      const formData = new FormData();
      formData.append('chat_id', String(chatId));
      const blob = new Blob([response.audioBuffer], { type: 'audio/mp3' });
      formData.append('voice', blob, 'response.mp3');
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
        method: 'POST',
        body: formData,
      });
    } else {
      // Send text message
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: response.text,
          parse_mode: 'HTML',
        }),
      });
    }
  } catch (error) {
    console.error('Failed to send Telegram response:', error);
  }
}