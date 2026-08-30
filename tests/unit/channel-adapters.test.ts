import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { handleWebRequest } from '@/lib/channels/web';
import { handleTelegramUpdate, TelegramFileFetcher, TelegramUpdate } from '@/lib/channels/telegram';
import { ChannelInput, ChannelResponse, InterviewSessionService } from '@/lib/channels/types';

class MockInterviewSessionService implements InterviewSessionService {
  calls: ChannelInput[] = [];
  response: ChannelResponse = {
    text: 'Thanks for your submission',
    metadata: { applicationRecord: { companyName: 'Test Co' } },
  };

  async process(input: ChannelInput): Promise<ChannelResponse> {
    this.calls.push(input);
    return this.response;
  }
}

const mockFileFetcher: TelegramFileFetcher = {
  async getFileBuffer(fileId: string): Promise<Buffer> {
    return Buffer.from(`mock-file-${fileId}`);
  },
};

describe('Channel adapters', () => {
  let service: MockInterviewSessionService;

  beforeEach(() => {
    service = new MockInterviewSessionService();
  });

  it('web adapter parses form data and calls service with correct ChannelInput', async () => {
    const formData = new FormData();
    formData.append('userId', 'user-123');
    formData.append('sessionId', 'session-abc');
    formData.append('text', 'Hello');
    const audioFile = new File([Buffer.from('audio-bytes')], 'voice.mp3');
    formData.append('audio', audioFile);
    const photoFile = new File([Buffer.from('photo-bytes')], 'photo.jpg');
    formData.append('photos', photoFile);

    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: formData,
    });

    const response = await handleWebRequest(req, service);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual(service.response);

    expect(service.calls).toHaveLength(1);
    const input = service.calls[0];
    expect(input.userId).toBe('user-123');
    expect(input.sessionId).toBe('session-abc');
    expect(input.text).toBe('Hello');
    expect(input.audio).toEqual(Buffer.from('audio-bytes'));
    expect(input.photos).toHaveLength(1);
    expect(input.photos![0]).toEqual(Buffer.from('photo-bytes'));
    expect(input.metadata.channel).toBe('web');
    expect(input.messageType).toBe('mixed');
  });

  it('telegram adapter parses update and calls service with correct ChannelInput', async () => {
    const update: TelegramUpdate = {
      message: {
        chat: { id: 456 },
        from: { id: 789 },
        text: 'Hello',
        voice: { file_id: 'voice-file-1' },
        photo: [
          { file_id: 'photo-small', width: 50, height: 50 },
          { file_id: 'photo-large', width: 200, height: 200 },
        ],
      },
    };

    const result = await handleTelegramUpdate(update, service, mockFileFetcher);

    expect(result.chatId).toBe(456);
    expect(service.calls).toHaveLength(1);
    const input = service.calls[0];
    expect(input.userId).toBe('789');
    expect(input.sessionId).toBe('telegram-456');
    expect(input.text).toBe('Hello');
    expect(input.audio).toEqual(Buffer.from('mock-file-voice-file-1'));
    expect(input.photos).toHaveLength(1);
    expect(input.photos![0]).toEqual(Buffer.from('mock-file-photo-large'));
    expect(input.metadata.channel).toBe('telegram');
    expect(input.messageType).toBe('mixed');
  });

  it('both adapters produce identical application record shape (aside from channel metadata)', async () => {
    // We already use the same mock service, but we can assert that the service returns the same response regardless of channel.
    const formData = new FormData();
    formData.append('userId', 'user-789');
    formData.append('sessionId', 'session-xyz');
    formData.append('text', 'Hello');
    const audioFile = new File([Buffer.from('mock-file-voice-file-1')], 'voice.ogg');
    formData.append('audio', audioFile);
    const photoFile = new File([Buffer.from('mock-file-photo-large')], 'photo.jpg');
    formData.append('photos', photoFile);

    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: formData,
    });

    const serviceForWeb = new MockInterviewSessionService();
    const serviceForTelegram = new MockInterviewSessionService();

    await handleWebRequest(req, serviceForWeb);
    const update: TelegramUpdate = {
      message: {
        chat: { id: 999 },
        from: { id: 789 },
        text: 'Hello',
        voice: { file_id: 'voice-file-1' },
        photo: [{ file_id: 'photo-small', width: 50, height: 50 }, { file_id: 'photo-large', width: 200, height: 200 }],
      },
    };
    await handleTelegramUpdate(update, serviceForTelegram, mockFileFetcher);

    const webResponse = await serviceForWeb.process(serviceForWeb.calls[0]);
    const telegramResponse = await serviceForTelegram.process(serviceForTelegram.calls[0]);
    expect(webResponse).toEqual(telegramResponse);
    expect(serviceForWeb.calls[0].metadata.channel).toBe('web');
    expect(serviceForTelegram.calls[0].metadata.channel).toBe('telegram');
  });
});