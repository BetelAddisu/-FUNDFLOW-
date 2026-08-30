import { NextRequest, NextResponse } from 'next/server';
import { ChannelInput, ChannelResponse, InterviewSessionService } from './types';
import { createServerSupabaseClient } from '../supabase';
import { getVoiceProvider } from '../ai/providers';

export async function handleWebRequest(
  req: NextRequest,
  service: InterviewSessionService
): Promise<NextResponse> {
  try {
    const formData = await req.formData();

    const sessionId = formData.get('sessionId') as string;
    const userId = formData.get('userId') as string;
    const language = formData.get('language') as 'en' | 'am' | 'om' || 'en';
    const text = formData.get('text') as string | null;
    const audioFile = formData.get('audio') as File | null;
    const photoFile = formData.get('photo') as File | null;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing sessionId or userId' },
        { status: 400 }
      );
    }

    let input: ChannelInput['input'];

    if (audioFile) {
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      input = {
        type: 'voice',
        audioBuffer,
        durationSec: Number(formData.get('durationSec')) || undefined,
      };
    } else if (photoFile) {
      const imageBuffer = Buffer.from(await photoFile.arrayBuffer());
      const caption = formData.get('caption') as string | null;
      input = {
        type: 'photo',
        imageBuffer,
        caption: caption || undefined,
      };
    } else if (text) {
      input = {
        type: 'text',
        content: text,
      };
    } else {
      return NextResponse.json(
        { error: 'No input provided (text, voice, or photo)' },
        { status: 400 }
      );
    }

    const channelInput: ChannelInput = {
      sessionId,
      channel: 'web',
      userId,
      language,
      input,
      timestamp: new Date().toISOString(),
    };

    const response: ChannelResponse = await service.process(channelInput);

    // If response has audio buffer, convert to base64 for JSON response
    let audioBase64: string | undefined;
    if (response.audioBuffer) {
      audioBase64 = response.audioBuffer.toString('base64');
    }

    return NextResponse.json({
      text: response.text,
      audioBase64,
      language: response.language,
      metadata: response.metadata,
    });
  } catch (error) {
    console.error('Web request handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function handleVoiceUpload(
  req: NextRequest,
  supabase = createServerSupabaseClient()
): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: 'Missing audio file or sessionId' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${sessionId}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from('applicant-audio')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('applicant-audio')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('Voice upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload audio' },
      { status: 500 }
    );
  }
}

export async function handlePhotoUpload(
  req: NextRequest,
  supabase = createServerSupabaseClient()
): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get('photo') as File;
    const sessionId = formData.get('sessionId') as string;
    const type = formData.get('type') as 'business_license' | 'workshop' | 'organogram' || 'business_license';

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: 'Missing photo file or sessionId' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${sessionId}/${type}-${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from('applicant-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('applicant-photos')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl, type });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}