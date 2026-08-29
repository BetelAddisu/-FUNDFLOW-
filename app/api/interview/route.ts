import { NextRequest, NextResponse } from "next/server";
import { processTurn, startApplication } from "@/lib/interview/session-service";
import { stores } from "@/lib/storage/store";
import type { ChannelInput } from "@/lib/channels/types";

export const runtime = "nodejs";

/**
 * POST /api/interview
 * Body: { action: "start", channel, language } | { action: "turn", sessionId?, applicationId?, channel, language?, input }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "start") {
      const channel = body.channel === "telegram" ? "telegram" : "web";
      const language: "en" | "am" | "om" = body.language === "am" || body.language === "om" ? body.language : "en";
      const { session, record, welcome, question } = await startApplication(channel, language);
      return NextResponse.json({
        ok: true,
        sessionId: session.id,
        applicationId: record.id,
        welcome,
        question,
        state: session.state,
      });
    }

    if (body.action === "turn") {
      const input = body.input as ChannelInput;
      if (!input) {
        return NextResponse.json({ ok: false, error: "missing input" }, { status: 400 });
      }
      const result = await processTurn(input, {
        channel: body.channel === "telegram" ? "telegram" : "web",
        language: body.language,
        sessionId: body.sessionId,
        applicationId: body.applicationId,
        senderId: body.senderId,
      });
      return NextResponse.json({
        ok: true,
        reply: result.reply,
        state: result.state.name,
        sessionId: result.session.id,
        applicationId: result.application.id,
        transcript: result.transcript,
        provider: result.provider,
        applied: result.applied,
      });
    }

    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

/** GET /api/interview?applicationId=... → current interview state */
export async function GET(req: NextRequest) {
  const applicationId = req.nextUrl.searchParams.get("applicationId");
  if (!applicationId) {
    return NextResponse.json({ ok: false, error: "applicationId required" }, { status: 400 });
  }
  const session = stores.sessions.byId(applicationId === "" ? "" : applicationId);
  const app = stores.applications.byId(applicationId);
  if (!app) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, session: session ?? null, application: app });
}