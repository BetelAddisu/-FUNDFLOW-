export interface ChannelInput {
  sessionId: string;
  channel: 'web' | 'telegram';
  userId: string;
  language: 'en' | 'am' | 'om';
  input: {
    type: 'text' | 'voice' | 'photo';
    content?: string;
    audioUrl?: string;
    audioBuffer?: Buffer;
    durationSec?: number;
    imageUrl?: string;
    imageBuffer?: Buffer;
    caption?: string;
  };
  timestamp: string;
}

export interface ChannelResponse {
  text: string;
  audioBuffer?: Buffer;
  audioUrl?: string;
  language: 'en' | 'am' | 'om';
  metadata?: Record<string, unknown>;
}

export interface InterviewSessionService {
  process(input: ChannelInput): Promise<ChannelResponse>;
}

export interface TelegramFileFetcher {
  getFileBuffer(fileId: string): Promise<Buffer>;
  getFileUrl(fileId: string): Promise<string>;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
    voice?: {
      file_id: string;
      file_unique_id: string;
      duration: number;
      mime_type?: string;
      file_size?: number;
    };
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
      file_size: number;
      width: number;
      height: number;
    }>;
    caption?: string;
  };
}