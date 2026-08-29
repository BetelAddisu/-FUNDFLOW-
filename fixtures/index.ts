/**
 * Fixture manifest loader. Only explicitly listed demo assets receive
 * deterministic transcript/document overrides; everything else goes through
 * the configured providers and can remain unresolved. This guarantees the
 * demo runs without paid APIs while never fabricating output for arbitrary
 * uploads.
 */
import fs from "node:fs";
import path from "node:path";

interface AudioSample {
  id: string;
  transcript: string;
  language?: string;
  durationSeconds?: number;
}

interface PhotoSample {
  id: string;
  documentKind: string;
  extractions?: Array<{ field: string; value: string }>;
}

let audioManifest: { samples: AudioSample[] } | null = null;
let photoManifest: { samples: PhotoSample[] } | null = null;

function load<T>(name: string): T {
  const file = path.join(process.cwd(), "fixtures", name);
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function audioFixtures(): Record<string, string> {
  if (!audioManifest) audioManifest = load<{ samples: AudioSample[] }>("audio/manifest.json");
  const map: Record<string, string> = {};
  for (const sample of audioManifest.samples) {
    map[sample.id] = sample.transcript;
  }
  return map;
}

export function photoFixtures(): Record<
  string,
  { documentKind: string; extractions: Array<{ field: string; value: string }>; unreadable?: boolean }
> {
  if (!photoManifest) photoManifest = load<{ samples: PhotoSample[] }>("images/manifest.json");
  const map: Record<string, { documentKind: string; extractions: Array<{ field: string; value: string }>; unreadable?: boolean }> = {};
  for (const sample of photoManifest.samples) {
    map[sample.id] = {
      documentKind: sample.documentKind,
      extractions: sample.extractions ?? [],
    };
  }
  return map;
}

/** Look up a demo file id → canonical transcript override if registered. */
export function lookupAudioTranscript(fileId: string): string | undefined {
  return audioFixtures()[fileId];
}

/** Look up a demo image id → document extractions if registered. */
export function lookupPhotoExtractions(fileId: string):
  | { documentKind: string; extractions: Array<{ field: string; value: string }> }
  | undefined {
  const p = photoFixtures()[fileId];
  return p;
}