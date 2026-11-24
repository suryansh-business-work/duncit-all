import type { RecordingFile } from 'crm-telephony';

import { callKey, type PlannedCall } from './callPlan';

/**
 * Which audio file the phone's own recorder saved for a call. Recorders name
 * files differently on every brand ("Call recording Rohit_241124_1530.m4a",
 * "+919811000001_20261124153012.amr", "Recordings/Call/…"), so a file earns
 * points for each sign it belongs to THIS call, and only a file with at least
 * one real sign is attached. A voice note recorded around the same time, with
 * no sign at all, is never sent.
 */

/** The server's transcription limit (Sarvam); a larger file stays on the phone. */
export const MAX_RECORDING_BYTES = 25 * 1024 * 1024;
/** Recorders finish writing a little after hang-up. */
export const RECORDING_GRACE_MS = 3 * 60 * 1000;
const CLOCK_SLACK_MS = 5000;
const DURATION_SLACK_MS = 10_000;

/** The window the phone's media store is searched in for this call. */
export function recordingWindow(call: Pick<PlannedCall, 'entry'>): { fromMs: number; toMs: number } {
  const end = call.entry.date + call.entry.durationSeconds * 1000;
  return { fromMs: call.entry.date - CLOCK_SLACK_MS, toMs: end + RECORDING_GRACE_MS };
}

const simplify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/** How strongly a file looks like this call's recording; 0 means "no sign at all". */
export function recordingScore(file: RecordingFile, call: PlannedCall): number {
  let score = 0;
  const name = simplify(file.name);
  const where = simplify(`${file.relativePath} ${file.name}`);
  const key = callKey(call.entry.number);
  if (key && name.includes(key.slice(-7))) score += 3;
  const contact = simplify(call.lead.contactName || call.entry.cachedName);
  if (contact.length >= 3 && name.includes(contact)) score += 2;
  if (where.includes('call')) score += 2;
  if (file.durationMs > 0 && Math.abs(file.durationMs - call.entry.durationSeconds * 1000) <= DURATION_SLACK_MS) score += 1;
  return score;
}

/** The recording to attach, or null — none found, too big, or nothing that is clearly this call's. */
export function pickRecording(call: PlannedCall, files: readonly RecordingFile[]): RecordingFile | null {
  if (call.outcome !== 'COMPLETED') return null;
  const { fromMs, toMs } = recordingWindow(call);
  let best: RecordingFile | null = null;
  let bestScore = 1;
  for (const file of files) {
    if (file.sizeBytes <= 0 || file.sizeBytes > MAX_RECORDING_BYTES) continue;
    if (file.addedAtMs < fromMs || file.addedAtMs > toMs) continue;
    const score = recordingScore(file, call);
    if (score > bestScore) {
      best = file;
      bestScore = score;
    }
  }
  return best;
}

/** An audio/* type the server accepts, from what the media store said or the file name. */
export function audioContentType(file: Pick<RecordingFile, 'mimeType' | 'name'>): string {
  if (/^audio\/[a-z0-9.+-]+$/i.test(file.mimeType)) return file.mimeType;
  const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  const byExt: Record<string, string> = { m4a: 'audio/mp4', mp3: 'audio/mpeg', amr: 'audio/amr', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg', '3gp': 'audio/3gpp' };
  return (ext && byExt[ext]) || 'audio/mp4';
}
