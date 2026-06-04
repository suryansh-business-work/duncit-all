import crypto from 'crypto';

/**
 * Tiny in-memory store for Servam-synthesized call audio. The AI-call webhook
 * generates a WAV per turn and references it by token in a Twilio `<Play>`;
 * Twilio then fetches `/twilio/ai-audio/:token`. Entries self-expire so the map
 * never grows unbounded. Single-process only (the CRM call volume is low).
 */
interface CachedAudio {
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const store = new Map<string, CachedAudio>();

function sweep() {
  const now = Date.now();
  for (const [key, value] of store) {
    if (value.expiresAt <= now) store.delete(key);
  }
}

export const audioCache = {
  put(buffer: Buffer, contentType = 'audio/wav'): string {
    sweep();
    const token = crypto.randomBytes(16).toString('hex');
    store.set(token, { buffer, contentType, expiresAt: Date.now() + TTL_MS });
    return token;
  },
  get(token: string): CachedAudio | null {
    const entry = store.get(token);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      store.delete(token);
      return null;
    }
    return entry;
  },
};
