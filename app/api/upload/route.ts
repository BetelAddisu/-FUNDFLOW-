import { NextRequest, NextResponse } from "next/server";
import { processTurn } from "@/lib/interview/session-service";
import { lookupAudioTranscript, lookupPhotoExtractions } from "@/fixtures";
import { stores } from "@/lib/storage/store";
import type { ChannelInput } from "@/lib/channels/types";

export const runtime = "nodejs";

/**
 * POST /api/upload  (multipart/form-data)
 * fields: type = "audio" | "image", file, caption?, documentKind?,
 *         sessionId?, applicationId?, channel?, language?
 *
 * The file is stored under data/uploads/ and processed through the normal
 * interview pipeline (STT for audio, vision for images).
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const type = (form.get("type") as string) ?? "image";
    const sessionId = (form.get("sessionId") as string) ?? undefined;
    const applicationId = (form.get("applicationId") as string) ?? undefined;
    const channel = form.get("channel") === "telegram" ? "telegram" : "web";
    const language = form.get("language") as "en" | "am" | "om" | undefined;
    const caption = (form.get("caption") as string) ?? undefined;
    const documentKind = (form.get("documentKind") as string) ?? undefined;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = (file.type ?? "bin").split("/")[1]?.replace("+", ".") ?? "bin";
    const fileId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `data/uploads/${fileId}.${ext}`;
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), "data", "uploads");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${fileId}.${ext}`), bytes);

    const input: ChannelInput =
      type === "audio"
        ? {
            type: "audio",
            fileRef: storagePath,
            mimeType: file.type,
            transcriptOverride: lookupAudioTranscript(fileId),
          }
        : {
            type: "image",
            fileRef: storagePath,
            caption,
            documentKind,
            mimeType: file.type,
            documentExtractions: type === "image" ? lookupPhotoExtractions(fileId)?.extractions : undefined,
          };

    const result = await processTurn(input, {
      channel,
      language,
      sessionId,
      applicationId,
      senderId: undefined,
    });

    return NextResponse.json({
      ok: true,
      reply: result.reply,
      state: result.state.name,
      sessionId: result.session.id,
      applicationId: result.application.id,
      transcript: result.transcript,
      provider: result.provider,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

/** GET evidence file from the local store (demo). */
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, note: "Use /review/evidence?id=... for file access." });
}