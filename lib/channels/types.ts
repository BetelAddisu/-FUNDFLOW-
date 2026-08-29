/**
 * Channel-agnostic input normalized by each channel adapter (web & Telegram).
 * All downstream processing goes through InterviewSessionService.
 */

export type ChannelInput =
  | { type: "text"; text: string }
  | {
      type: "audio";
      fileRef: string;
      durationSeconds?: number;
      mimeType?: string;
      /** typed transcript override used by the deterministic demo fixture */
      transcriptOverride?: string;
    }
  | {
      type: "image";
      fileRef: string;
      caption?: string;
      documentKind?: string;
      mimeType?: string;
      /** deterministic fixture for the demo (safe OCR substitute) */
      documentExtractions?: Array<{ field: string; value: string }>;
    };

export interface ChannelResponse {
  text: string;
  replyText?: string;
  state?: string;
  needsReviewCount?: number;
  gapsCount?: number;
  contradictionCount?: number;
  transcript?: string;
  provider?: string;
  messageId?: string;
}

export interface ChannelContext {
  channel: "web" | "telegram";
  language?: "en" | "am" | "om";
  senderId?: string;
  applicationId?: string;
  sessionId?: string;
}