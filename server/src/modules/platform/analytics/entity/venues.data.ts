import type { Types } from 'mongoose';
import { VenueModel, type VenueStatus } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';
import { dayKeyExpr, inRange } from './window';
import { average, pct, tally, total } from './shapes';
import { loadHeldPods, type HeldPod } from './held-pods';
import type { DayRow } from './pods.data';

/**
 * Everything the Venues analytics page reads. Venues number in the hundreds, so
 * the page groups them in memory the way the Clubs page groups clubs; slots,
 * pods and the audit trail are aggregated in Mongo.
 */

export interface VenueRow {
  _id: Types.ObjectId;
  venue_name: string;
  status: VenueStatus;
  created_at: Date;
  location_id?: Types.ObjectId | null;
  venue_category?: { category_id?: Types.ObjectId | null };
}

export const loadVenues = () =>
  VenueModel.find({})
    .select('venue_name status created_at location_id venue_category.category_id')
    .lean<VenueRow[]>();

/** A held pod (see held-pods.ts) that ran at a partner venue. */
export interface VenuePod extends HeldPod {
  venue_id: string;
}

/**
 * How a venue answered a slot request. A decline written by the deadline sweep
 * is EXPIRED rather than DECLINED: the venue never looked, which is a
 * different problem from a venue that looked and said no.
 */
export type RequestOutcome = 'APPROVED' | 'DECLINED' | 'EXPIRED';

export interface Decision {
  pod_id: Types.ObjectId;
  outcome: RequestOutcome;
  at: Date;
}

export interface VenuePeriod {
  pods: VenuePod[];
  /** Pods that asked a partner venue for its slot, per day of asking. */
  requests: DayRow[];
  decisions: Decision[];
  /** Mean wait between a request and its answer, in milliseconds. */
  decision_ms: number;
  /** Pods at a venue cancelled in the period, per day. */
  cancelled: DayRow[];
}

async function loadVenuePods(from: Date, to: Date): Promise<VenuePod[]> {
  const [held, atVenues] = await Promise.all([
    loadHeldPods(from, to),
    PodModel.find({ pod_date_time: inRange(from, to), venue_id: { $ne: null } })
      .select('venue_id')
      .lean<Array<{ _id: Types.ObjectId; venue_id: Types.ObjectId }>>(),
  ]);
  const venueOf = new Map(atVenues.map((pod) => [pod._id.toHexString(), pod.venue_id.toHexString()]));
  return held.flatMap((pod) => {
    const venueId = venueOf.get(pod.id);
    return venueId ? [{ ...pod, venue_id: venueId }] : [];
  });
}

/** A pod asks a venue for its slot when it is created against someone else's venue. */
const ASKED_A_VENUE = ['PENDING', 'APPROVED', 'DECLINED'];

// Cancelled pods are soft-deleted, and a request still counts once its pod is gone.
const slotRequests = (from: Date, to: Date, zone: string) =>
  PodModel.aggregate<DayRow>([
    { $match: { created_at: inRange(from, to), venue_approval_status: { $in: ASKED_A_VENUE } } },
    { $group: { _id: dayKeyExpr('created_at', zone), value: { $sum: 1 } } },
  ]).option({ includeDeleted: true });

const venueCancellations = (from: Date, to: Date, zone: string) =>
  PodModel.aggregate<DayRow>([
    { $match: { venue_id: { $ne: null }, deleted_at: inRange(from, to) } },
    { $group: { _id: dayKeyExpr('deleted_at', zone), value: { $sum: 1 } } },
  ]).option({ includeDeleted: true });

interface AuditRow {
  pod_id: Types.ObjectId;
  action: string;
  source: string;
  created_at: Date;
}

function outcomeOf(row: AuditRow): RequestOutcome {
  if (row.action === 'VENUE_APPROVED') return 'APPROVED';
  return row.source === 'SYSTEM' ? 'EXPIRED' : 'DECLINED';
}

/**
 * Every venue answer in the period, read from the pod audit trail. The slot's
 * own decision fields are overwritten by the next request on the same slot;
 * the trail is append-only, so an answer given once is counted once.
 */
async function loadDecisions(from: Date, to: Date): Promise<Decision[]> {
  const rows = await PodAuditLogModel.find({
    action: { $in: ['VENUE_APPROVED', 'VENUE_DECLINED'] },
    created_at: inRange(from, to),
  })
    .select('pod_id action source created_at')
    .lean<AuditRow[]>();
  return rows.map((row) => ({ pod_id: row.pod_id, outcome: outcomeOf(row), at: row.created_at }));
}

/** The newest of `times` that is not after `limit`, or null when none is. */
function latestBefore(times: readonly Date[], limit: Date): Date | null {
  let latest: Date | null = null;
  for (const at of times) {
    if (at <= limit && (!latest || at > latest)) latest = at;
  }
  return latest;
}

/**
 * The mean wait for an answer. A request starts when its pod was created or
 * last resubmitted — the two moments a pod asks a venue for a slot — so an
 * answer is measured from the latest of those before it.
 */
async function meanDecisionMs(decisions: readonly Decision[]): Promise<number> {
  if (decisions.length === 0) return 0;
  const asks = await PodAuditLogModel.find({
    pod_id: { $in: decisions.map((decision) => decision.pod_id) },
    action: { $in: ['CREATE', 'RESUBMIT'] },
  })
    .select('pod_id created_at')
    .lean<Array<{ pod_id: Types.ObjectId; created_at: Date }>>();
  const asksByPod = new Map<string, Date[]>();
  for (const ask of asks) {
    const key = ask.pod_id.toHexString();
    const times = asksByPod.get(key) ?? [];
    times.push(ask.created_at);
    asksByPod.set(key, times);
  }
  const waits = decisions.flatMap((decision) => {
    const asked = latestBefore(asksByPod.get(decision.pod_id.toHexString()) ?? [], decision.at);
    return asked ? [decision.at.getTime() - asked.getTime()] : [];
  });
  return Math.round(average(waits));
}

/** Everything the page reads for ONE period — loaded for the chosen period and the one before. */
export async function loadVenuePeriod(from: Date, to: Date, zone: string): Promise<VenuePeriod> {
  const [pods, requests, decisions, cancelled] = await Promise.all([
    loadVenuePods(from, to),
    slotRequests(from, to, zone),
    loadDecisions(from, to),
    venueCancellations(from, to, zone),
  ]);
  return { pods, requests, decisions, decision_ms: await meanDecisionMs(decisions), cancelled };
}

const dayCount = (rows: ReadonlyArray<{ value: number }>) => total(rows.map((row) => row.value));

/** Each tile's value for one period — computed identically for both periods. */
export function venueFigures(venues: readonly VenueRow[], period: VenuePeriod, from: Date, to: Date) {
  const outcomes = tally(period.decisions.map((decision) => decision.outcome));
  return {
    created: venues.filter((venue) => venue.created_at >= from && venue.created_at < to).length,
    active: new Set(period.pods.map((pod) => pod.venue_id)).size,
    requests: dayCount(period.requests),
    approval_rate: pct(outcomes.get('APPROVED') ?? 0, period.decisions.length),
    expired: outcomes.get('EXPIRED') ?? 0,
    decision_ms: period.decision_ms,
    pods_held: period.pods.length,
    fill_rate: pct(total(period.pods.map((pod) => pod.seats)), total(period.pods.map((pod) => pod.spots))),
    cancellations: dayCount(period.cancelled),
  };
}

/** Requests the venue can still answer — the ones sitting in its queue right now. */
export const pendingRequests = (now: Date) =>
  VenueSlotModel.countDocuments({ status: 'PENDING', booked_by_pod_id: { $ne: null }, start_at: { $gt: now } });

/** Every slot still to come, by status — the availability venues have published. */
export const upcomingSlots = (now: Date) =>
  VenueSlotModel.aggregate<{ _id: string; count: number }>([
    { $match: { start_at: { $gte: now } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
