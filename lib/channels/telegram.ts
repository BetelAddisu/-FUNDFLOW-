/**
 * Telegram channel adapter. Stateless: converts Telegram updates into
 * generic ChannelInput events and forwards them to the same
 * InterviewSessionService the web channel uses. No eligibility or scoring
 * logic belongs here.
 */
import type { ChannelInput, ChannelContext } from "@/lib/channels/types";
import type { InterviewSession } from "@/lib/db/schema";
import { stores } from "@/lib/storage/store";

export interface TelegramUpdate {
  update_id?: number;
  message?: {
    message_id?: number;
    from?: { id?: number; first_name?: string; language_code?: string };
    chat?: { id?: number; type?: string };
    text?: string;
    caption?: string;
    voice?: { file_id?: string; duration?: number; mime_type?: string };
    audio?: { file_id?: string; duration?: number; mime_type?: string };
    photo?: Array<{ file_id?: string; file_unique_id?: string }>;
    document?: { file_id?: string; mime_type?: string };
    contact?: unknown;
  };
}

function mapLanguage(lang?: string): "en" | "am" | "om" | undefined {
  if (!lang) return undefined;
  const l = lang.toLowerCase();
  if (l.startsWith("am")) return "am";
  if (l.startsWith("om") || l.startsWith("or")) return "om";
  return "en";
}

/**
 * Find the active session for a Telegram sender. Telegram sessions are keyed
 * by chat id embedded in the session id (sess_<chatId>_<ts>).
 */
function sessionForChat(chatId: string): InterviewSession | undefined {
  return stores.sessions
    .all()
    .filter((s) => s.channel === "telegram")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .find((s) => s.id.includes(`_${chatId}_`));
}

export function normalizeTelegramUpdate(
  update: TelegramUpdate,
  fixtures?: { audioTranscripts?: Record<string, string>; photoExtractions?: Record<string, Array<{ field: string; value: string }>> }
):
  | { kind: "message"; input: ChannelInput; context: ChannelContext }
  | { kind: "ignored"; reason: string } {
  const message = update.message;
  if (!message?.chat?.id) return { kind: "ignored", reason: "no_message" };
  const chatId = String(message.chat.id);
  const language = mapLanguage(message.from?.language_code);

  const context: ChannelContext = {
    channel: "telegram",
    senderId: String(message.from?.id ?? ""),
    language,
    sessionId: sessionForChat(chatId)?.id,
    applicationId: sessionForChat(chatId)?.applicationId,
  };

  if (message.voice || message.audio) {
    const file = message.voice ?? message.audio;
    const fileId = file?.file_id;
    if (!fileId) return { kind: "ignored", reason: "no_file_id" };
    return {
      kind: "message",
      input: {
        type: "audio",
        fileRef: fileId,
        durationSeconds: file?.duration,
        mimeType: file?.mime_type,
        transcriptOverride: fixtures?.audioTranscripts?.[fileId],
      },
      context,
    };
  }

  if (message.photo && message.photo.length > 0) {
    const largest = message.photo[message.photo.length - 1];
    return {
      kind: "message",
      input: {
        type: "image",
        fileRef: largest.file_id ?? "",
        caption: message.caption,
        documentKind: /license|registration|permit/i.test(message.caption ?? "")
          ? "business_license"
          : "workshop",
        mimeType: "image/jpeg",
        documentExtractions: fixtures?.photoExtractions?.[largest.file_id ?? ""],
      },
      context,
    };
  }

  if (message.text || message.caption) {
    return {
      kind: "message",
      input: { type: "text", text: message.text ?? message.caption ?? "" },
      context,
    };
  }

  return { kind: "ignored", reason: "unsupported_message_type" };
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  opts?: { parseMode?: "HTML" | "Markdown" }
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured (webhook dry-run)" };
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: opts?.parseMode ?? "HTML",
        }),
      }
    );
    if (!res.ok) return { ok: false, error: `telegram http ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}