import { NextRequest, NextResponse } from 'next/server';
import { handleWebRequest } from '@/lib/channels/web';
import { sessionService } from '@/lib/session-service';

export async function POST(req: NextRequest) {
  return handleWebRequest(req, sessionService);
}