import mongoose from 'mongoose';
import { logs } from '@observability/log';
import { AiFeatureSettingModel } from './aiFeature.model';

/**
 * The ONE check every AI call passes before it spends money: is this feature
 * switched on in the AI portal?
 *
 * It is read by `openaiChat` — the single funnel every OpenAI call already goes
 * through — so no call site checks a flag of its own and none can forget to.
 *
 * Fails OPEN. A feature is off only when an admin has stored `enabled: false`;
 * no row, no database connection (unit tests) or a failed read all answer ON,
 * because an unreadable switch must not silently turn moderation, support
 * replies and every other AI feature off at once.
 *
 * Cached for a short window because this sits in front of every call (an image
 * scan per upload). The process that saves a toggle clears its cache at once;
 * any other process (the BullMQ worker) picks the change up within the window.
 */
const CACHE_MS = 30_000;

let cache: { at: number; disabled: Set<string> } | null = null;

async function loadDisabled(): Promise<Set<string>> {
  const current = cache;
  if (current && Date.now() - current.at < CACHE_MS) return current.disabled;
  const rows = await AiFeatureSettingModel.find({ enabled: false }).select('key').lean();
  const disabled = new Set(rows.map((row) => row.key));
  cache = { at: Date.now(), disabled };
  return disabled;
}

export async function isAiFeatureEnabled(key: string): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) return true;
  try {
    return !(await loadDisabled()).has(key);
  } catch (err) {
    logs.server.warn('aiFeature', 'guard', {
      error: err,
      msg: 'AI feature switch unreadable — treating the feature as on',
      feature: key,
    });
    return true;
  }
}

/** Forget the cached switches — called after a toggle is saved. */
export function clearAiFeatureCache(): void {
  cache = null;
}
