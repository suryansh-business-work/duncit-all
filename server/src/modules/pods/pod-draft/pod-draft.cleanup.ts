/**
 * Background cleanup that permanently deletes Create-Pod drafts once they pass
 * the admin-configured retention window (Admin > Pods > Pod Settings; default 3
 * days from the draft's last save). Idempotent (a plain deleteMany on a cutoff)
 * and fault-tolerant (the interval survives any DB error), mirroring the
 * status-scheduler pattern. No-ops under NODE_ENV=test.
 */
import { PodDraftModel } from './pod-draft.model';
import { AppSettingsModel } from '@modules/platform/settings/settings.model';

const DAY_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = DAY_MS; // once every 24h (off-peak-agnostic)
const FIRST_SWEEP_DELAY_MS = 60_000; // ~1 min after boot
const DEFAULT_RETENTION_DAYS = 3;

/** The configured retention window, clamped to a sane minimum of 1 day. */
async function retentionDays(): Promise<number> {
  const doc = await AppSettingsModel.findOne({ singleton_key: 'app' })
    .select('draft_retention_days')
    .lean();
  const raw = Number(doc?.draft_retention_days ?? DEFAULT_RETENTION_DAYS);
  return Math.max(1, Math.floor(raw) || DEFAULT_RETENTION_DAYS);
}

/** Delete every draft whose last save is older than the retention window.
 * Returns how many were removed. Safe to run on any schedule. */
export async function runPodDraftCleanup(): Promise<number> {
  const days = await retentionDays();
  const cutoff = new Date(Date.now() - days * DAY_MS);
  const res = await PodDraftModel.deleteMany({ updated_at: { $lt: cutoff } });
  return res.deletedCount ?? 0;
}

/** Start the daily draft-cleanup loop (first sweep ~1 min after boot). Returns a
 * stop function. No-ops under NODE_ENV=test. */
export function startPodDraftCleanupScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const sweep = () => {
    runPodDraftCleanup().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[pod-draft-cleanup] sweep failed:', err);
    });
  };
  const first = setTimeout(sweep, FIRST_SWEEP_DELAY_MS);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
  // Never keep the process alive just for draft cleanup.
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
