import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { PodModel, type PodVenueApproval } from '../pod/pod.model';
import { podLiveEnd } from '../pod/pod.lifecycle';
import { insertPodWithFreeSlug, resolvePodSlugForCreate } from '../pod/pod.slug';

/**
 * A recurring pod's PARENT row — the one pod everyone browses.
 *
 * It holds no slot, seats or money of its own: each DATE row underneath does.
 * The parent only MIRRORS its dates so every reader that knows nothing about
 * series still shows it right:
 *   - `pod_date_time` is the next date that has not ended (the last one once
 *     all have), so feeds sort and label it by when it next happens;
 *   - `pod_end_date_time` is the end of the LAST date, so the pod stays live
 *     until its last date is over and only then counts as completed;
 *   - seats are the next date's, so a card's "spots left" is the next date's;
 *   - it is online while any date is, pending while every date waits on the
 *     venue, and cancelled once no date is left.
 */

/** The date fields the parent is derived from. */
const DATE_FIELDS =
  'pod_date_time pod_end_date_time deleted_at completed_at is_active venue_approval_status pod_attendees extra_seats';

interface DateRow {
  _id: Types.ObjectId;
  pod_date_time: Date;
  pod_end_date_time?: Date | null;
  deleted_at?: Date | null;
  completed_at?: Date | null;
  is_active?: boolean;
  venue_approval_status?: PodVenueApproval;
  pod_attendees?: Types.ObjectId[];
  extra_seats?: number;
}

/** A date that still runs: not cancelled and not refused by the venue. */
const runs = (d: DateRow) => !d.deleted_at && d.venue_approval_status !== 'DECLINED';

/** The parent's venue state: online when any date is through, pending while
 * every date still waits. */
function parentApproval(dates: DateRow[]): PodVenueApproval {
  if (dates.some((d) => d.venue_approval_status === 'APPROVED')) return 'APPROVED';
  if (dates.some((d) => (d.venue_approval_status ?? 'NONE') === 'NONE')) return 'NONE';
  return 'PENDING';
}

/** Every write the parent needs to mirror its dates as they stand at `now`. */
export function parentMirror(dates: DateRow[], now: Date): Record<string, unknown> {
  const live = dates.filter(runs).sort((a, b) => a.pod_date_time.getTime() - b.pod_date_time.getTime());
  const last = live.at(-1);
  if (!last) return { deleted_at: now, is_active: false, series_total: 0 };
  const next = live.find((d) => (podLiveEnd(d)?.getTime() ?? 0) > now.getTime()) ?? last;
  const doneAt = live.map((d) => d.completed_at?.getTime() ?? null);
  const allDone = doneAt.every((at) => at !== null);
  return {
    deleted_at: null,
    pod_date_time: next.pod_date_time,
    pod_end_date_time: podLiveEnd(last),
    venue_approval_status: parentApproval(live),
    is_active: live.some((d) => d.is_active),
    pod_attendees: next.pod_attendees ?? [],
    extra_seats: next.extra_seats ?? 0,
    completed_at: allDone ? new Date(Math.max(...doneAt.map(Number))) : null,
    series_total: live.length,
  };
}

/** Re-derives one parent from its dates. Safe to call any time, any number of times. */
export async function syncSeriesParent(parentId: Types.ObjectId | string): Promise<void> {
  const dates = await PodModel.find({ series_parent_id: new Types.ObjectId(String(parentId)) })
    .setOptions({ includeDeleted: true })
    .select(DATE_FIELDS)
    .lean<DateRow[]>();
  if (dates.length === 0) return;
  await PodModel.updateOne({ _id: parentId }, { $set: parentMirror(dates, new Date()) }).setOptions({
    includeDeleted: true,
  });
}

/**
 * Re-derives the parent of whatever pod changed, if it is a date of a
 * recurring pod. Never throws: the change itself already happened, and the
 * sweep repairs a parent this missed.
 */
export async function syncSeriesParentOf(podId: Types.ObjectId | string | null | undefined): Promise<void> {
  if (!podId || !Types.ObjectId.isValid(String(podId))) return;
  try {
    const pod = await PodModel.findById(podId)
      .setOptions({ includeDeleted: true })
      .select('series_parent_id')
      .lean<{ series_parent_id?: Types.ObjectId | null }>();
    if (pod?.series_parent_id) await syncSeriesParent(pod.series_parent_id);
  } catch (error) {
    logs.server.error('podSeries', 'syncSeriesParentOf', { pod_id: String(podId), error });
  }
}

/** Fields a date carries that are its own and never the parent's. */
const DATE_ONLY_FIELDS = [
  '_id',
  'pod_id',
  'venue_slot_id',
  'series_index',
  'series_parent_id',
  'created_at',
  'updated_at',
  'completed_at',
  'deleted_at',
  'cancellation_risk',
  '__v',
] as const;

/**
 * Writes the parent of a freshly published series, copied from its first date
 * (same title, club, venue, price, media and rules) under the title's own slug,
 * and points every date at it.
 */
export async function createSeriesParent(
  seriesId: Types.ObjectId,
  datePodIds: Types.ObjectId[],
  naming: { club_id: unknown; pod_title: unknown }
): Promise<Types.ObjectId> {
  // A merged older series may have lost its first date to a cancellation; it is
  // still the best copy of what the pod is, and the sync below decides the rest.
  const first = await PodModel.findById(datePodIds[0])
    .setOptions({ includeDeleted: true })
    .lean<Record<string, unknown>>();
  if (!first) throw new Error('The first date of the series is missing');
  const { slug, base: slugBase } = await resolvePodSlugForCreate(naming);
  const payload: Record<string, unknown> = { ...first };
  for (const key of DATE_ONLY_FIELDS) delete payload[key];
  Object.assign(payload, {
    pod_id: slug,
    venue_slot_id: null,
    series_id: seriesId,
    series_role: 'PARENT',
    series_index: null,
  });
  const parent = await insertPodWithFreeSlug(payload, first.club_id, slugBase);
  await PodModel.updateMany(
    { _id: { $in: datePodIds } },
    { $set: { series_role: 'DATE', series_parent_id: parent._id } }
  ).setOptions({ includeDeleted: true });
  await syncSeriesParent(parent._id);
  return parent._id;
}

/**
 * Cancelling a recurring pod — which is what cancelling its PARENT means —
 * cancels every date that has not started yet, each through `cancelOne` (the
 * ordinary cancel, so every refund and message runs per date). Dates that
 * already ran stay, so the pod keeps its history. Returns the sum of what
 * `cancelOne` returned, or null when no date was left to cancel.
 */
export async function cancelUpcomingDates(
  parentId: Types.ObjectId | string,
  cancelOne: (dateDocId: string) => Promise<number | boolean | null>
): Promise<number | null> {
  const dates = await PodModel.find({
    series_parent_id: new Types.ObjectId(String(parentId)),
    pod_date_time: { $gt: new Date() },
  })
    .select('_id')
    .sort({ pod_date_time: 1 })
    .lean();
  let cancelled: number | null = null;
  for (const date of dates) {
    const result = await cancelOne(String(date._id));
    if (result !== null && result !== false) cancelled = (cancelled ?? 0) + (typeof result === 'number' ? result : 0);
  }
  await syncSeriesParent(parentId);
  return cancelled;
}

/** Rolls every live parent on to its next date and repairs any it missed. */
export async function runSeriesParentSweep(now = new Date()): Promise<number> {
  const parents = await PodModel.find({
    series_role: 'PARENT',
    completed_at: null,
    pod_end_date_time: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
  })
    .select('_id')
    .lean();
  for (const parent of parents) await syncSeriesParent(parent._id);
  return parents.length;
}

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const SWEEP_FIRST_DELAY_MS = 60 * 1000;

/** Start the parent roll-forward sweep. Returns a stop function; no-ops under NODE_ENV=test. */
export function startSeriesParentScheduler(): () => void {
  return startClusterJob({
    component: 'podSeries',
    operation: 'parentSweep',
    firstDelayMs: SWEEP_FIRST_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: async () => {
      await runSeriesParentSweep();
    },
  });
}
