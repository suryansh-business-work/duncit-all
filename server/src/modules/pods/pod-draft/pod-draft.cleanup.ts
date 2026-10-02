/**
 * Background cleanup that permanently deletes Create-Pod drafts once they pass
 * the admin-configured retention window (Admin > Pods > Pod Settings; default 3
 * days from the draft's CREATION date, so an autosave cannot keep an abandoned
 * draft alive forever). Idempotent (a plain deleteMany on a cutoff) and
 * fault-tolerant (the interval survives any DB error), mirroring the
 * status-scheduler pattern. No-ops under NODE_ENV=test.
 */
import { PodDraftModel } from './pod-draft.model';
import { DAY_MS, draftRetentionDays } from './pod-draft.retention';
import { startClusterJob } from '@utils/clusterJob';

const SWEEP_INTERVAL_MS = DAY_MS; // once every 24h (off-peak-agnostic)
const FIRST_SWEEP_DELAY_MS = 60_000; // ~1 min after boot

/** Delete every draft created longer ago than the retention window.
 * Returns how many were removed. Safe to run on any schedule. */
export async function runPodDraftCleanup(): Promise<number> {
  const days = await draftRetentionDays();
  const cutoff = new Date(Date.now() - days * DAY_MS);
  const res = await PodDraftModel.deleteMany({ created_at: { $lt: cutoff } });
  return res.deletedCount ?? 0;
}

/** Start the daily draft-cleanup loop (first sweep ~1 min after boot). Returns a
 * stop function. No-ops under NODE_ENV=test. */
export function startPodDraftCleanupScheduler(): () => void {
  return startClusterJob({
    component: 'pod-draft-cleanup',
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: runPodDraftCleanup,
  });
}
