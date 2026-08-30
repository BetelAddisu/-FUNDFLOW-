import { ChannelInput, ChannelResponse, InterviewSessionService } from './types';

export interface TelegramFileFetcher {
  getFileBuffer(fileId: string): Promise<Buffer>;
}

export interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number };
    text?: string;
    voice?: { file_id: string };
    photo?: Array<{ file_id: string; width: number; height: number; file_size?: number }>;
  };
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  service: InterviewSessionService,
  fileFetcher: TelegramFileFetcher
): Promise<ChannelResponse & { chatId: number }> {
  const msg = update.message;
  if (!msg) {
    throw new Error('No message in update');
  }

  const chatId = msg.chat.id;
  const userId = String(msg.from?.id ?? chatId);
  const sessionId = `telegram-${chatId}`;

  const text = msg.text;
  const voiceFileId = msg.voice?.file_id;
  const photoFileIds = msg.photo?.map((p) => p.file_id) ?? [];

  let audio: Buffer | undefined;
  if (voiceFileId) {
    audio = await fileFetcher.getFileBuffer(voiceFileId);
  }

  let photos: Buffer[] | undefined;
  if (photoFileIds.length > 0) {
    const largestPhotoId = photoFileIds[photoFileIds.length - 1];
    photos = [await fileFetcher.getFileBuffer(largestPhotoId)];
  }

  const input: ChannelInput = {
    userId,
    sessionId,
    messageType: 'mixed',
    text,
    audio,
    photos,
    metadata: { channel: 'telegram' },
  };

  if (text && !audio && !photos) {
    input.messageType = 'text';
  } else if (audio && !photos) {
    input.messageType = 'voice';
  } else if (photos && !audio) {
    input.messageType = 'photo';
  } else if (photos || audio) {
    input.messageType = 'mixed';
  }

  const response = await service.process(input);
  return { ...response, chatId };
}