import { NextRequest, NextResponse } from 'next/server';
import { handlePhotoUpload } from '@/lib/channels/web';

export async function POST(req: NextRequest) {
  return handlePhotoUpload(req);
}