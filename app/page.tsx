"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { role: "assistant" | "applicant" | "meta"; text: string };

interface ServerTurnResponse {
  ok: boolean;
  reply?: string;
  state?: string;
  sessionId?: string;
  applicationId?: string;
  transcript?: string;
  provider?: string;
  error?: string;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "am", label: "አማርኛ (Amharic)" },
  { code: "om", label: "Afaan Oromoo" },
] as const;

type Lang = (typeof LANGUAGES)[number]["code"];

export default function ApplicantChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Welcome to FundFlow. Tell me about your business (you can talk, type, or share photos). ጤና ይስጥልኝ — ስለ ስራዎ ይንገሩኝ።" },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [applicationId, setApplicationId] = useState<string | undefined>();
  const [language, setLanguage] = useState<Lang>("en");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Deterministic engine — no LLM required");
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const scrollDown = () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollDown, [messages]);

  const start = useCallback(async () => {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", channel: "web", language }),
    });
    const data: ServerTurnResponse & { welcome?: string; question?: string } = await res.json();
    if (data.ok && data.sessionId && data.applicationId) {
      setSessionId(data.sessionId);
      setApplicationId(data.applicationId);
      setMessages([{ role: "assistant", text: `${data.welcome ?? ""} ${data.question ?? ""}` }]);
    }
  }, [language]);

  useEffect(() => {
    if (!sessionId) void start();
  }, [sessionId, start]);

  const sendText = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || busy) return;
      setInput("");
      setMessages((m) => [...m, { role: "applicant", text }]);
      setBusy(true);
      setStatus("Processing turn…");
      try {
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "turn",
            channel: "web",
            language,
            sessionId,
            applicationId,
            input: { type: "text", text },
          }),
        });
        const data: ServerTurnResponse = await res.json();
        if (data.ok && data.reply) {
          setMessages((m) => [...m, { role: "assistant", text: data.reply ?? "" }]);
          if (data.provider) setStatus(`Provider: ${data.provider}`);
          if (data.state === "complete") setStatus("Application complete — submitted for review.");
        } else {
          setMessages((m) => [...m, { role: "assistant", text: `Sorry, something went wrong: ${data.error ?? "unknown"}` }]);
        }
      } finally {
        setBusy(false);
      }
    },
    [input, busy, language, sessionId, applicationId]
  );

  const uploadFile = useCallback(
    async (file: Blob | File, kind: "audio" | "image", caption?: string) => {
      if (!file || busy) return;
      const name = "name" in file ? (file as File).name : "recording.webm";
      setMessages((m) => [...m, { role: "applicant", text: kind === "audio" ? "🎤 (voice note)" : `📷 (photo: ${name})` }]);
      setBusy(true);
      setStatus("Uploading…");
      const form = new FormData();
      form.append("file", file);
      form.append("type", kind);
      form.append("channel", "web");
      form.append("language", language);
      if (caption) form.append("caption", caption);
      if (sessionId) form.append("sessionId", sessionId);
      if (applicationId) form.append("applicationId", applicationId);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data: ServerTurnResponse = await res.json();
        if (data.ok && data.reply) {
          setMessages((m) => [...m, { role: "assistant", text: data.reply ?? "" }]);
          if (data.transcript) setMessages((m) => [...m, { role: "meta", text: `🗒 ${data.transcript}` }]);
          if (data.provider) setStatus(`Provider: ${data.provider}`);
        } else {
          setMessages((m) => [...m, { role: "assistant", text: `Upload failed: ${data.error ?? "unknown"}` }]);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, language, sessionId, applicationId]
  );

  const toggleMic = useCallback(async () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        void uploadFile(blob, "audio");
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (e) {
      setMessages((m) => [...m, { role: "meta", text: `Mic unavailable (${String(e)}) — you can type instead.` }]);
    }
  }, [listening, uploadFile]);

  return (
    <div className="container">
      <div className="card chat-shell">
        <div className="chat-header">
          <div className="logo">FF</div>
          <div className="title">FundFlow <span className="muted">applicant chat</span></div>
          <div className="row" style={{ marginLeft: "auto" }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`chip ${language === l.code ? "active" : ""}`}
                onClick={() => setLanguage(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.text}
            </div>
          ))}
          <div ref={messagesEnd} />
        </div>

        <div className="composer">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,audio/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f, f.type.startsWith("audio") ? "audio" : "image");
          e.target.value = "";
            }}
          />
          <button className="icon-btn" title="Voice" onClick={toggleMic} aria-label="Record voice note">
            {listening ? "⏹" : "🎤"}
          </button>
          <button className="icon-btn" title="Attach photo" onClick={() => fileRef.current?.click()} aria-label="Attach photo">
            📷
          </button>
          <textarea
            rows={1}
            value={input}
            placeholder="Type or speak…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendText();
              }
            }}
          />
          <button className="icon-btn primary" onClick={() => void sendText()} aria-label="Send">
            ➤
          </button>
        </div>
      </div>
      <div className="muted" style={{ textAlign: "center", padding: "8px 0" }}>
        {status}
      </div>
    </div>
  );
}