import { NextRequest, NextResponse } from "next/server";
import { processTurn, startApplication } from "@/lib/interview/session-service";
import {
  normalizeTelegramUpdate,
  sendTelegramMessage,
  type TelegramUpdate,
} from "@/lib/channels/telegram";
import { audioFixtures, photoFixtures } from "@/fixtures";

export const runtime = "nodejs";

/**
 * POST /api/telegram/webhook
 * Telegram → adapter → InterviewSessionService (same engine as web).
 * Returns 200 for ignored updates; replies are sent via the Bot API when a
 * token is configured, otherwise the webhook is a dry-run (demo).
 */
export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const body = (await req.json()) as TelegramUpdate;

  const normalized = normalizeTelegramUpdate(body, {
    audioTranscripts: audioFixtures(),
    photoExtractions: photoFixtures() as unknown as Record<string, Array<{ field: string; value: string }>>,
  });

  if (normalized.kind === "ignored") {
    return NextResponse.json({ ok: true, ignored: normalized.reason });
  }

  const { input, context } = normalized;
  const chatKey = String(body.message?.chat?.id ?? "");

  // First-time sender: create a session keyed by chat id so subsequent
  // messages resume the same application.
  if (!context.sessionId) {
    const language = context.language ?? "en";
    const started = await startApplication("telegram", language, `sess_tg_${chatKey}`);
    context.sessionId = started.session.id;
    context.applicationId = started.record.id;
  }

  const result = await processTurn(input, context);
  const replyTarget = chatKey;

  // Always reply in the session language via the sendMessage path; if no
  // token is configured the response simply carries the text so the demo
  // UI/tests can assert equality.
  const sent = await sendTelegramMessage(replyTarget, result.reply);
  return NextResponse.json({ ok: true, reply: result.reply, sentOk: sent.ok, error: sent.error });
}