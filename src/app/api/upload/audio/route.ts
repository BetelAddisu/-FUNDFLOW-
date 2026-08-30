import { NextRequest, NextResponse } from 'next/server';
import { handleVoiceUpload } from '@/lib/channels/web';

export async function POST(req: NextRequest) {
  return handleVoiceUpload(req);
}