import { getAppTimeZone } from '@utils/app-time';
import { startClusterJob } from '@utils/clusterJob';
import { logs } from '@observability/log';
import { SYSTEM_ACTOR, withRun } from '../runs/marketingRun.service';
import { PodPromoModel, type PodPromoDoc } from './podPromo.model';
import { loadPromoSettings } from './podPromo.settings';
import { candidatePods } from './podPromo.eligibility';
import { dueForPlanning, MIN_LEAD_MS, postSlot } from './podPromo.schedule';
import { MAX_AUTO_ATTEMPTS } from './podPromo.claim';
import { promotePod } from './podPromo.promote';
import { applySyncAction, findSyncActions } from './podPromo.sync';
import { figuresFor } from './podPromo.figures';

/**
 * The pod promotion clock: every fifteen minutes, on the scheduler leader.
 *
 * One pass promotes every eligible pod whose slot falls within the planning
 * window (and resumes or retries any promotion a crash or a failure left
 * half-done), then carries out the changes the sync found. A tick with work
 * opens one POD_PROMO run with a step per pod; a quiet tick leaves no trace.
 * Figures are refreshed after, outside the run — reading numbers is not an
 * action anyone needs to audit.
 */
export const TICK_MS = 15 * 60_000;
const FIRST_DELAY_MS = 4 * 60_000;
const COMPONENT = 'pod-promotions';
const MAX_PER_TICK = 15;
const FIGURES_PER_TICK = 100;
/** Figures keep being read for a month after the pod, while late bookings and payments can still be credited. */
const FIGURES_TAIL_MS = 30 * 86_400_000;

interface Due {
  podId: PodPromoDoc['pod_id'];
  start: Date;
}

async function duePods(now: Date): Promise<{ due: Due[]; settings: Awaited<ReturnType<typeof loadPromoSettings>> }> {
  const settings = await loadPromoSettings();
  if (!settings.enabled) return { due: [], settings };
  const zone = getAppTimeZone();
  const candidates = await candidatePods(settings, now);
  const taken = await PodPromoModel.find({ pod_id: { $in: candidates.map((pod) => pod._id) } }).select('pod_id').lean<{ pod_id: unknown }[]>();
  const promoted = new Set(taken.map((row) => String(row.pod_id)));
  const fresh = candidates.filter((pod) => {
    if (promoted.has(String(pod._id))) return false;
    const slot = postSlot({ start: pod.pod_date_time, now, daysBefore: settings.days_before, postHour: settings.post_hour, zone });
    return !!slot && dueForPlanning(slot, now);
  });
  // Half-done rows (a crash mid-way) and failures that never made a post are picked up again.
  const resumable = await PodPromoModel.find({
    pod_start: { $gt: new Date(now.getTime() + MIN_LEAD_MS) },
    $and: [
      { $or: [{ locked_until: null }, { locked_until: { $lt: now } }] },
      { $or: [{ status: { $in: ['PLANNED', 'BANNER_READY'] } }, { status: 'FAILED', attempts: { $lt: MAX_AUTO_ATTEMPTS }, scheduled_post_id: null }] },
    ],
  })
    .select('pod_id pod_start')
    .lean<{ pod_id: PodPromoDoc['pod_id']; pod_start: Date }[]>();
  const due = [...resumable.map((row) => ({ podId: row.pod_id, start: row.pod_start })), ...fresh.map((pod) => ({ podId: pod._id, start: pod.pod_date_time }))];
  return { due: due.slice(0, MAX_PER_TICK), settings };
}

/** Refresh the numbers of promotions still collecting them, stalest first. */
export async function refreshFigures(now = new Date()): Promise<number> {
  const rows = await PodPromoModel.find({ status: { $in: ['SCHEDULED', 'PUBLISHED'] }, pod_start: { $gt: new Date(now.getTime() - FIGURES_TAIL_MS) } })
    .sort({ 'figures.updated_at': 1 })
    .limit(FIGURES_PER_TICK)
    .select('pod_id short_link_id scheduled_post_id')
    .lean<PodPromoDoc[]>();
  for (const row of rows) {
    await PodPromoModel.updateOne({ _id: row._id }, { $set: { figures: await figuresFor(row, now) } });
  }
  return rows.length;
}

/** One pass. Returns the run's id, or null when there was nothing to do. */
export async function plannerPass(now: Date = new Date()): Promise<string | null> {
  const [{ due, settings }, actions] = await Promise.all([duePods(now), findSyncActions()]);
  let runId: string | null = null;
  if (due.length > 0 || actions.length > 0) {
    runId = await withRun(
      { workflow: 'POD_PROMO', name: `Pod promotions: ${due.length} to promote, ${actions.length} to update`, trigger: 'SCHEDULE', actor: SYSTEM_ACTOR },
      async (run) => {
        for (const item of due) {
          const promo = await promotePod({ podId: item.podId, podStart: item.start, settings, source: 'AUTO', userId: null, now, restart: false }, run);
          if (promo?.status === 'FAILED') logs.server.warn(COMPONENT, 'promotePod', { pod_id: String(item.podId), error: promo.error });
        }
        for (const action of actions) await applySyncAction(action, settings, run, now).catch(() => undefined);
        return run.id;
      }
    );
  }
  await refreshFigures(now);
  return runId;
}

export function startPodPromoScheduler(): () => void {
  return startClusterJob({ component: COMPONENT, operation: 'plan', firstDelayMs: FIRST_DELAY_MS, intervalMs: TICK_MS, run: () => plannerPass() });
}
