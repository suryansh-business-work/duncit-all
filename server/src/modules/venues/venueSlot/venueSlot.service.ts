import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { Types } from 'mongoose';
import { VenueSlotModel, type IVenueSlot, type VenueSlotStatus } from './venueSlot.model';
import { VenueModel, type IVenue } from '@modules/venues/venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { venueLocalYmd } from '@modules/venues/autoExtend/slotGenerator';
import { podAuditService, snapshotPod } from '@modules/pods/podAudit/podAudit.service';
import { venueSideOf } from '@modules/finance/finance/breakdown.math';
import { resolveEffectiveRates } from '@modules/finance/finance/settlement.service';
import { notifyEach, type NotifyInput } from '@services/notify/notify.service';
import { getUrlConfigs } from '@config/url-configs';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

export async function ensureOwnedVenue(userId: string, venueId: string) {
  if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue_id');
  const venue = await VenueModel.findOne({
    _id: venueId,
    owner_user_id: new Types.ObjectId(userId),
  });
  if (!venue) fail('NOT_FOUND', 'Venue not found or not yours');
  return venue!;
}

async function loadPodTitles(slots: IVenueSlot[]) {
  const ids = slots
    .map((s) => s.booked_by_pod_id)
    .filter((id): id is Types.ObjectId => !!id);
  if (!ids.length) return new Map<string, string>();
  const pods = await PodModel.find({ _id: { $in: ids } }).select('pod_title');
  const map = new Map<string, string>();
  pods.forEach((p) => map.set(String(p._id), p.pod_title));
  return map;
}

const toPub = (s: IVenueSlot, venueName: string, podTitle: string | null) => ({
  id: String(s._id),
  venue_id: String(s.venue_id),
  venue_name: venueName,
  start_at: s.start_at.toISOString(),
  end_at: s.end_at.toISOString(),
  whole_day: s.whole_day ?? false,
  price: s.price ?? 0,
  space_label: s.space_label ?? '',
  capacity: s.capacity ?? 0,
  status: s.status,
  booked_by_pod_id: s.booked_by_pod_id ? String(s.booked_by_pod_id) : null,
  booked_pod_title: podTitle,
  notes: s.notes ?? '',
  created_at: s.created_at?.toISOString() ?? '',
});

async function withVenueAndPod(slots: IVenueSlot[]) {
  const venueIds = Array.from(new Set(slots.map((s) => String(s.venue_id))));
  const venues = await VenueModel.find({ _id: { $in: venueIds } }).select('venue_name');
  const vmap = new Map(venues.map((v) => [String(v._id), v.venue_name || '']));
  const pmap = await loadPodTitles(slots);
  return slots.map((s) =>
    toPub(
      s,
      vmap.get(String(s.venue_id)) || '',
      s.booked_by_pod_id ? pmap.get(String(s.booked_by_pod_id)) ?? null : null
    )
  );
}

function parseDate(value: string, label: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) fail('BAD_USER_INPUT', `${label} must be a valid date`);
  return d;
}

// How many days ahead a venue may publish availability — keeps the calendar
// finite and bookable windows realistic. Configurable per venue via
// settings.rules.max_advance_days (default 60, clamped 1..60). A venue may
// schedule availability at most 60 days ahead.
const DEFAULT_MAX_ADVANCE_DAYS = 60;
const MAX_ADVANCE_DAYS_CAP = 60;

const venueMaxAdvance = (
  venue: { settings?: { rules?: { max_advance_days?: number } } } | null
): number => {
  const n = Math.round(Number(venue?.settings?.rules?.max_advance_days));
  if (!Number.isFinite(n)) return DEFAULT_MAX_ADVANCE_DAYS;
  return Math.max(1, Math.min(MAX_ADVANCE_DAYS_CAP, n));
};

/** Per-venue slot constraints the write paths validate against: the advance
 * cap plus the owner's leave/holiday dates (no slots may exist on those). */
interface SlotRules {
  maxAdvanceDays: number;
  holidays: Set<string>;
}

const venueSlotRules = (venue: Pick<IVenue, 'settings'> | null): SlotRules => ({
  maxAdvanceDays: venueMaxAdvance(venue),
  holidays: new Set(venue?.settings?.holidays ?? []),
});

/**
 * How a new slot that collides with an existing one in the SAME space is
 * resolved. FAIL is the default so no caller loses data by omission.
 */
export type SlotConflictMode = 'FAIL' | 'SKIP' | 'REPLACE';

/** The bulk-create payload both the owner and the admin mutation carry. */
interface BulkCreateInput {
  venue_id: string;
  slots: Array<{
    start_at: string;
    end_at: string;
    whole_day?: boolean;
    notes?: string;
    price?: number;
    space_label?: string;
    capacity?: number;
  }>;
  on_conflict?: SlotConflictMode;
}

// A slot may span multiple days (a whole-date-range / multi-day activity
// booking), but never more than the advance window itself.
const MAX_SLOT_SPAN_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function validateSlotWindow(start: Date, end: Date, rules: SlotRules) {
  if (end.getTime() <= start.getTime()) fail('BAD_USER_INPUT', 'end_at must be after start_at');
  if (start.getTime() < Date.now() - 60_000) fail('BAD_USER_INPUT', 'Cannot create slots in the past');
  if (start.getTime() > Date.now() + rules.maxAdvanceDays * DAY_MS) {
    fail('BAD_USER_INPUT', `Slots can only be scheduled up to ${rules.maxAdvanceDays} days in advance`);
  }
  if (end.getTime() - start.getTime() > MAX_SLOT_SPAN_DAYS * DAY_MS) {
    fail('BAD_USER_INPUT', `A slot cannot span more than ${MAX_SLOT_SPAN_DAYS} days`);
  }
  // No part of the slot may fall on a leave/holiday — a multi-day booking that
  // crosses a holiday is as unbookable as one starting on it. The end instant
  // itself is exclusive so a slot ending exactly at midnight claims no extra day.
  const lastYmd = venueLocalYmd(new Date(end.getTime() - 1));
  for (let cursor = start.getTime(); ; cursor += DAY_MS) {
    const ymd = venueLocalYmd(new Date(cursor));
    if (ymd > lastYmd) break;
    if (rules.holidays.has(ymd)) {
      fail('BAD_REQUEST', `${ymd} is marked as a venue leave/holiday`);
    }
    if (ymd === lastYmd) break;
  }
}

// Slot price in whole rupees — non-negative integer. Defaults to 0 (free).
const MAX_SLOT_PRICE = 1_000_000;
function normalizePrice(value: unknown): number {
  const n = Math.round(Number(value) || 0);
  if (n < 0) fail('BAD_USER_INPUT', 'price must be 0 or more');
  if (n > MAX_SLOT_PRICE) fail('BAD_USER_INPUT', `price must be ${MAX_SLOT_PRICE} or less`);
  return n;
}

// A slot's guest capacity — non-negative integer (0 = unset/whole venue).
const MAX_SLOT_CAPACITY = 100_000;
function normalizeCapacity(value: unknown): number {
  const n = Math.round(Number(value) || 0);
  if (n < 0) fail('BAD_USER_INPUT', 'capacity must be 0 or more');
  if (n > MAX_SLOT_CAPACITY) fail('BAD_USER_INPUT', `capacity must be ${MAX_SLOT_CAPACITY} or less`);
  return n;
}

async function findOverlap(
  venueId: string,
  start: Date,
  end: Date,
  spaceLabel: string,
  ignoreId?: string
) {
  const q: any = {
    venue_id: new Types.ObjectId(venueId),
    start_at: { $lt: end },
    end_at: { $gt: start },
    // Overlaps are per space: two spaces (or whole-venue) may share a time
    // window. '' matches whole-venue slots including legacy docs with no field.
    space_label: spaceLabel === '' ? { $in: ['', null] } : spaceLabel,
  };
  if (ignoreId) q._id = { $ne: new Types.ObjectId(ignoreId) };
  return VenueSlotModel.findOne(q);
}

async function loadSlot(slotId: string) {
  if (!Types.ObjectId.isValid(slotId)) fail('BAD_USER_INPUT', 'Invalid slot_id');
  const slot = await VenueSlotModel.findById(slotId);
  if (!slot) fail('NOT_FOUND', 'Slot not found');
  return slot!;
}

/** A slot that is BOOKED, or holds a PENDING request, is never overwritten —
 * the pod behind it has to be cancelled or decided first. */
const UNREPLACEABLE: ReadonlySet<VenueSlotStatus> = new Set(['BOOKED', 'PENDING']);

interface PreparedSlot {
  start: Date;
  end: Date;
  whole_day: boolean;
  notes: string;
  price: number;
  space_label: string;
  capacity: number;
}

/** The one definition of "these two clash": same space, overlapping windows.
 * Different spaces may share a time window, so they never clash. */
function collides(p: PreparedSlot, e: Pick<IVenueSlot, 'start_at' | 'end_at' | 'space_label'>) {
  return (e.space_label ?? '') === p.space_label && e.start_at < p.end && e.end_at > p.start;
}

/** Every existing slot that could clash with the batch — one query across the
 * batch's whole span rather than one per slot. */
async function loadPotentialClashes(venueId: string, prepared: PreparedSlot[]) {
  const earliest = new Date(Math.min(...prepared.map((p) => p.start.getTime())));
  const latest = new Date(Math.max(...prepared.map((p) => p.end.getTime())));
  return VenueSlotModel.find({
    venue_id: new Types.ObjectId(venueId),
    start_at: { $lt: latest },
    end_at: { $gt: earliest },
  }).select('start_at end_at space_label status');
}

interface ConflictPlan {
  /** The slots that survive the caller's conflict mode. */
  create: PreparedSlot[];
  /** Existing slots to delete before inserting (REPLACE only). */
  replaceIds: unknown[];
  /** True when a booked slot or a pending request held one of the new windows. */
  blockedByBooked: boolean;
}

/** Splits the batch into what to create and what to delete first, per mode. */
async function planConflicts(
  venueId: string,
  prepared: PreparedSlot[],
  mode: SlotConflictMode
): Promise<ConflictPlan> {
  const existing = await loadPotentialClashes(venueId, prepared);
  if (mode === 'FAIL') {
    for (const p of prepared) {
      const clash = existing.find((e) => collides(p, e));
      if (clash) {
        fail(
          'CONFLICT',
          `Overlaps with existing slot ${clash.start_at.toISOString()} – ${clash.end_at.toISOString()}`
        );
      }
    }
    return { create: prepared, replaceIds: [], blockedByBooked: false };
  }
  const locked = existing.filter((e) => UNREPLACEABLE.has(e.status));
  // SKIP yields to every existing slot; REPLACE only to the ones it may not delete.
  const blocking = mode === 'REPLACE' ? locked : existing;
  const create = prepared.filter((p) => !blocking.some((e) => collides(p, e)));
  const replaceIds =
    mode === 'REPLACE'
      ? existing
          .filter((e) => !UNREPLACEABLE.has(e.status) && create.some((p) => collides(p, e)))
          .map((e) => e._id)
      : [];
  return { create, replaceIds, blockedByBooked: prepared.some((p) => locked.some((e) => collides(p, e))) };
}

/** Two slots of ONE batch may never claim the same space at the same time —
 * that is a caller bug, not a data conflict, so no mode forgives it. */
function assertNoSelfOverlap(slots: PreparedSlot[]) {
  const bySpace = new Map<string, PreparedSlot[]>();
  for (const p of slots) {
    const group = bySpace.get(p.space_label) ?? [];
    group.push(p);
    bySpace.set(p.space_label, group);
  }
  for (const group of bySpace.values()) {
    const sorted = [...group].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].start.getTime() < sorted[i - 1].end.getTime()) {
        fail('CONFLICT', 'Two of the new slots overlap with each other');
      }
    }
  }
}

// Core create/update/delete shared by the owner-scoped methods (partner editing
// their own venue) and the admin methods (onboarding editing any venue). The
// caller is responsible for the ownership/role check before invoking these.
async function createSlotsCore(
  venueId: string,
  ownerUserId: string,
  slots: BulkCreateInput['slots'],
  rules: SlotRules,
  mode: SlotConflictMode = 'FAIL'
) {
  if (!slots?.length) fail('BAD_USER_INPUT', 'At least one slot is required');

  const prepared: PreparedSlot[] = slots.map((s) => {
    const start = parseDate(s.start_at, 'start_at');
    const end = parseDate(s.end_at, 'end_at');
    validateSlotWindow(start, end, rules);
    return {
      start,
      end,
      whole_day: Boolean(s.whole_day),
      notes: (s.notes ?? '').trim(),
      price: normalizePrice(s.price),
      space_label: (s.space_label ?? '').trim(),
      capacity: normalizeCapacity(s.capacity),
    };
  });

  const plan = await planConflicts(venueId, prepared, mode);
  if (plan.create.length === 0) {
    fail(
      'CONFLICT',
      plan.blockedByBooked
        ? 'Every new slot overlaps a booked slot or a pending request, which cannot be replaced.'
        : 'Every matching slot already exists — nothing to add.'
    );
  }
  assertNoSelfOverlap(plan.create);
  if (plan.replaceIds.length > 0) {
    await VenueSlotModel.deleteMany({ _id: { $in: plan.replaceIds } });
  }

  const docs = await VenueSlotModel.insertMany(
    plan.create.map((p) => ({
      venue_id: new Types.ObjectId(venueId),
      owner_user_id: new Types.ObjectId(ownerUserId),
      start_at: p.start,
      end_at: p.end,
      whole_day: p.whole_day,
      price: p.price,
      space_label: p.space_label,
      capacity: p.capacity,
      notes: p.notes,
      status: 'AVAILABLE',
    }))
  );
  return withVenueAndPod(docs as IVenueSlot[]);
}

async function updateSlotCore(
  slot: IVenueSlot,
  input: { start_at?: string; end_at?: string; notes?: string; block?: boolean; price?: number },
  rules: SlotRules
) {
  if (slot.status === 'BOOKED') {
    fail('BAD_REQUEST', 'Booked slots cannot be edited. Cancel the pod first.');
  }
  if (slot.status === 'PENDING') {
    fail('BAD_REQUEST', 'This slot has a pending booking request. Approve or decline it first.');
  }
  if (input.start_at !== undefined || input.end_at !== undefined) {
    const start = input.start_at ? parseDate(input.start_at, 'start_at') : slot.start_at;
    const end = input.end_at ? parseDate(input.end_at, 'end_at') : slot.end_at;
    validateSlotWindow(start, end, rules);
    const overlap = await findOverlap(String(slot.venue_id), start, end, slot.space_label ?? '', String(slot._id));
    if (overlap) {
      fail(
        'CONFLICT',
        `Overlaps with existing slot ${overlap.start_at.toISOString()} – ${overlap.end_at.toISOString()}`
      );
    }
    slot.start_at = start;
    slot.end_at = end;
  }
  if (input.notes !== undefined) slot.notes = (input.notes ?? '').trim();
  if (input.price !== undefined) slot.price = normalizePrice(input.price);
  if (input.block !== undefined) slot.status = input.block ? 'BLOCKED' : 'AVAILABLE';
  await (slot as any).save();
  return (await withVenueAndPod([slot]))[0];
}

async function removeSlotCore(slot: IVenueSlot) {
  if (slot.status === 'BOOKED') {
    fail('BAD_REQUEST', 'Booked slots cannot be deleted. Cancel the pod first.');
  }
  if (slot.status === 'PENDING') {
    fail('BAD_REQUEST', 'This slot has a pending booking request. Approve or decline it first.');
  }
  await (slot as any).deleteOne();
  return true;
}

async function listSlotsForVenue(venueId: string, from?: string | null, to?: string | null) {
  const q: any = { venue_id: new Types.ObjectId(venueId) };
  if (from || to) q.start_at = {};
  if (from) q.start_at.$gte = parseDate(from, 'from');
  if (to) q.start_at.$lte = parseDate(to, 'to');
  const docs = await VenueSlotModel.find(q).sort({ start_at: 1 }).limit(500);
  return withVenueAndPod(docs);
}

// Non-booked slots of a venue matching a bulk filter: `from`..`to` (from defaults
// to "now" so historical slots are never touched) plus an optional weekday set,
// matched in local time — the same basis the recurring generator uses.
async function matchingBulkSlots(
  venueId: string,
  from?: string | null,
  to?: string | null,
  weekdays?: number[] | null
) {
  // Booked slots and pending booking requests are never bulk-touched.
  const q: any = { venue_id: new Types.ObjectId(venueId), status: { $nin: ['BOOKED', 'PENDING'] } };
  q.start_at = { $gte: from ? parseDate(from, 'from') : new Date() };
  if (to) q.start_at.$lte = parseDate(to, 'to');
  const docs = await VenueSlotModel.find(q).sort({ start_at: 1 }).limit(2000);
  if (!weekdays?.length) return docs;
  const set = new Set(weekdays);
  return docs.filter((s) => set.has(s.start_at.getDay()));
}

/** Bulk price/status change with no time shift — a single atomic updateMany. */
async function bulkSetFields(slots: IVenueSlot[], set: { price?: number; status?: VenueSlotStatus }) {
  if (set.price === undefined && set.status === undefined) {
    fail('BAD_USER_INPUT', 'No bulk update specified');
  }
  const ids = slots.map((s) => s._id);
  const r = await VenueSlotModel.updateMany({ _id: { $in: ids } }, { $set: set });
  return { matched: slots.length, affected: r.modifiedCount ?? 0, skipped: 0 };
}

/** The shifted / resized window for one bulk-updated slot, or null when the slot
 * must be skipped (out of range, in the past, or colliding with another slot). */
async function bulkShiftedWindow(
  slot: IVenueSlot,
  input: { shift_minutes?: number; set_duration_minutes?: number },
  rules: SlotRules
): Promise<{ start: Date; end: Date } | null> {
  let start = new Date(slot.start_at);
  let end = new Date(slot.end_at);
  if (input.shift_minutes !== undefined) {
    start = new Date(start.getTime() + input.shift_minutes * 60_000);
    end = new Date(end.getTime() + input.shift_minutes * 60_000);
  }
  if (input.set_duration_minutes !== undefined) {
    end = new Date(start.getTime() + input.set_duration_minutes * 60_000);
  }
  try {
    validateSlotWindow(start, end, rules);
  } catch {
    return null; // out of range / past → skip this slot, keep the batch
  }
  const overlap = await findOverlap(
    String(slot.venue_id),
    start,
    end,
    slot.space_label ?? '',
    String(slot._id)
  );
  return overlap ? null : { start, end };
}

/** `destinationFor` reads the number off two of these fields and `notifyEvent`
 * reads the address off a third, so a narrower projection makes every WhatsApp
 * send skip with "No WhatsApp number" and every email skip in silence. */
const WA_CONTACT_FIELDS =
  'profile.first_name profile.last_name auth.email auth.phone communication.whatsapp';

const contactName = (u: any) =>
  `${u?.profile?.first_name ?? ''} ${u?.profile?.last_name ?? ''}`.trim();

/** Every WhatsApp template prints the date and the time as two placeholders,
 * unlike the single combined string the in-app note and the emails use. */
const waWhen = (at: Date) => ({
  date: at.toLocaleString('en-IN', { dateStyle: 'medium' }),
  time: at.toLocaleString('en-IN', { timeStyle: 'short' }),
});

/** Everything the decision templates fill, resolved once for all six sends. */
interface SlotDecisionFacts {
  entityId: string;
  podTitle: string;
  venueName: string;
  clubId: unknown;
  hostName: string;
  date: string;
  time: string;
  hosts: any[];
  owner: any;
}

/** The club admin the pod is handed to. */
async function clubAdminName(clubId: unknown): Promise<string> {
  const club = await ClubModel.findById(clubId).select('admin_user_ids').lean();
  const adminId = (club?.admin_user_ids ?? [])[0];
  if (!adminId) return '';
  const admin = await UserModel.findById(adminId)
    .select('profile.first_name profile.last_name')
    .lean();
  return contactName(admin);
}

/** The decision to the pod's hosts — every one of them, matching the in-app
 * note, so a co-hosted pod costs one message per host. */
function hostDecisionSends(facts: SlotDecisionFacts, approved: boolean): NotifyInput[] {
  const event = approved ? 'HOST_SLOT_APPROVED' : 'HOST_SLOT_REJECTED';
  return facts.hosts.map((host) => {
    const name = contactName(host);
    return {
      event,
      entityId: facts.entityId,
      user: host,
      name,
      params: [name, facts.podTitle, facts.podTitle, facts.date, facts.time, facts.venueName, facts.podTitle],
    };
  });
}

/** The same decision back to the venue owner who made it — the approval also
 * carries the Venue Studio link, the rejection does not. */
async function venueDecisionSends(facts: SlotDecisionFacts, approved: boolean): Promise<NotifyInput[]> {
  if (!facts.owner) return [];
  const name = contactName(facts.owner);
  const to = { entityId: facts.entityId, user: facts.owner, name };
  if (approved) {
    // The Partners portal's venue home, the same surface the slot-request email
    // sends them to — mWeb's `/venues/manage` does not exist over there.
    const { partnersUrl } = await getUrlConfigs();
    const studioUrl = `${partnersUrl.replace(/\/+$/, '')}/venues/dashboard`;
    return [
      {
        ...to,
        event: 'VENUE_SLOT_APPROVED',
        params: [name, facts.podTitle, facts.podTitle, facts.date, facts.time, facts.hostName, studioUrl],
        vars: { studio_url: studioUrl },
      },
    ];
  }
  return [
    {
      ...to,
      event: 'VENUE_SLOT_REJECTED',
      params: [name, facts.podTitle, facts.podTitle, facts.date, facts.time, facts.hostName],
    },
  ];
}

/** "Your pod is live" to both sides of the booking — one campaign, one key per
 * audience. Only the primary host is told; the co-hosts already have the
 * approval message above. */
async function podPublishedSends(facts: SlotDecisionFacts): Promise<NotifyInput[]> {
  const clubAdmin = await clubAdminName(facts.clubId);
  // The template's whole point is naming the club admin the pod was handed to,
  // and a blank value would be recorded FAILED rather than sent.
  if (!clubAdmin) return [];
  const details = [
    facts.podTitle,
    facts.podTitle,
    facts.date,
    facts.time,
    facts.venueName,
    facts.hostName,
    clubAdmin,
  ];
  const sends: NotifyInput[] = [];
  if (facts.owner) {
    const ownerName = contactName(facts.owner);
    sends.push({
      event: 'VENUE_POD_PUBLISHED',
      entityId: facts.entityId,
      user: facts.owner,
      name: ownerName,
      params: [ownerName, ...details],
    });
  }
  const host = facts.hosts[0];
  if (host) {
    sends.push({
      event: 'HOST_POD_PUBLISHED',
      entityId: facts.entityId,
      user: host,
      name: facts.hostName,
      params: [facts.hostName, ...details],
    });
  }
  return sends;
}

/** Best-effort WhatsApp beside the in-app note: the decision to the hosts and
 * to the venue owner, plus the pod-is-live pair once it is approved. The sends
 * themselves never throw; the lookups feeding them can. */
async function whatsappSlotDecision(pod: any, slot: IVenueSlot, approved: boolean) {
  try {
    const venue = await VenueModel.findById(slot.venue_id).select('venue_name owner_user_id').lean();
    if (!venue) return;
    const [hosts, owner] = await Promise.all([
      UserModel.find({ _id: { $in: pod.pod_hosts_id ?? [] } })
        .select(WA_CONTACT_FIELDS)
        .lean(),
      UserModel.findById(venue.owner_user_id).select(WA_CONTACT_FIELDS).lean(),
    ]);
    const { date, time } = waWhen(slot.start_at);
    const facts: SlotDecisionFacts = {
      entityId: String(pod._id),
      podTitle: pod.pod_title ?? '',
      venueName: venue.venue_name ?? '',
      clubId: pod.club_id,
      hostName: contactName(hosts[0]),
      date,
      time,
      hosts,
      owner,
    };
    const sends = [
      ...hostDecisionSends(facts, approved),
      ...(await venueDecisionSends(facts, approved)),
    ];
    if (approved) sends.push(...(await podPublishedSends(facts)));
    // `notifyEach`, not `sendEach`: the same four decisions now also go out as
    // `host-slot-approved`, `venue-slot-approved`, `host-pod-published` and
    // their declined twins, filled from the very same `params` array. The
    // address comes off each account's own `auth.email`, already projected.
    await notifyEach(sends);
  } catch (err) {
    logs.server.error('venueSlot', 'whatsappSlotDecision', {
      error: err,
      msg: 'decision whatsapp failed',
      approved,
      slot_id: String(slot._id),
    });
  }
}

/** Best-effort in-app note to the pod's hosts when a venue decides a request. */
async function notifySlotDecision(pod: any, slot: IVenueSlot, approved: boolean, reason?: string | null) {
  try {
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    const when = slot.start_at.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const title = approved ? 'Venue approved your slot' : 'Venue declined your slot';
    const note = reason?.trim() ? ` Reason: ${reason.trim()}` : '';
    const body = approved
      ? `"${pod.pod_title}" is confirmed for ${when} — your pod is now live.`
      : `"${pod.pod_title}" (${when}) was declined by the venue.${note}`;
    await notificationService.create({
      title,
      body,
      scope: 'USER',
      target_user_ids: (pod.pod_hosts_id ?? []).map(String),
      silent: false,
    });
  } catch (err) {
    logs.server.error('venueSlot', 'notifySlotDecision', {
      error: err,
      msg: 'decision notification failed',
      approved,
      slot_id: String(slot._id),
    });
  }
  // Outside the block above so a failed in-app note still reaches WhatsApp.
  await whatsappSlotDecision(pod, slot, approved);
}

/** One pending booking request row: the slot joined with its requesting pod,
 * that pod's first host's contact details and the venue name. */
function toRequestRow(s: IVenueSlot, pod: any, host: any, venueName: string) {
  const hostName = host
    ? `${host.profile?.first_name ?? ''} ${host.profile?.last_name ?? ''}`.trim()
    : '';
  return {
    slot_id: String(s._id),
    venue_id: String(s.venue_id),
    venue_name: venueName,
    start_at: s.start_at.toISOString(),
    end_at: s.end_at.toISOString(),
    whole_day: s.whole_day ?? false,
    price: s.price ?? 0,
    requested_at: s.updated_at?.toISOString() ?? '',
    pod_id: String(pod._id),
    pod_title: pod.pod_title ?? '',
    pod_description: pod.pod_description ?? '',
    host_name: hostName,
    host_email: host?.auth?.email ?? '',
    host_phone: `${host?.auth?.phone?.extension ?? ''}${host?.auth?.phone?.number ?? ''}`,
  };
}

export const venueSlotService = {
  async listForVenue(viewerId: string, venueId: string, from?: string | null, to?: string | null) {
    if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue_id');
    const venue = await VenueModel.findById(venueId);
    if (!venue) fail('NOT_FOUND', 'Venue not found');
    // Owner sees everything; non-owners can only fetch via venueAvailableSlots.
    if (String(venue!.owner_user_id) !== viewerId) {
      fail('FORBIDDEN', 'Only the venue owner can view all slots');
    }
    return listSlotsForVenue(venueId, from, to);
  },

  // Admin (onboarding/super-admin) read of any venue's slots — role-gated in the
  // resolver. Unlike listForVenue there is no owner check.
  async adminListForVenue(venueId: string, from?: string | null, to?: string | null) {
    if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue_id');
    const venue = await VenueModel.findById(venueId);
    if (!venue) fail('NOT_FOUND', 'Venue not found');
    return listSlotsForVenue(venueId, from, to);
  },

  async listAvailable(venueId: string, from?: string | null) {
    if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue_id');
    const venue = await VenueModel.findOne({
      _id: venueId,
      status: 'APPROVED',
      is_active: true,
    });
    if (!venue) fail('NOT_FOUND', 'Venue not found or not approved');
    const cutoff = from ? parseDate(from, 'from') : new Date();
    const docs = await VenueSlotModel.find({
      venue_id: new Types.ObjectId(venueId),
      status: 'AVAILABLE',
      start_at: { $gte: cutoff },
    })
      .sort({ start_at: 1 })
      .limit(500);
    // Leave/holiday dates are never bookable — hide any stragglers created
    // before the date was marked as leave.
    const holidays = new Set(venue!.settings?.holidays ?? []);
    const open = docs.filter((s) => !holidays.has(venueLocalYmd(s.start_at)));
    return withVenueAndPod(open);
  },

  async create(userId: string, input: BulkCreateInput) {
    const venue = await ensureOwnedVenue(userId, input.venue_id);
    return createSlotsCore(input.venue_id, userId, input.slots, venueSlotRules(venue), input.on_conflict);
  },

  // Admin create — slots are owned by the venue's actual owner, not the editor.
  async adminCreate(input: BulkCreateInput) {
    if (!Types.ObjectId.isValid(input.venue_id)) fail('BAD_USER_INPUT', 'Invalid venue_id');
    const venue = await VenueModel.findById(input.venue_id);
    if (!venue) fail('NOT_FOUND', 'Venue not found');
    return createSlotsCore(
      input.venue_id,
      String(venue!.owner_user_id),
      input.slots,
      venueSlotRules(venue),
      input.on_conflict
    );
  },

  /** Insert generated slots, silently DROPPING any that fall in the past,
   * beyond the cap, or overlap an existing/earlier slot — instead of throwing.
   * Idempotent (re-running creates nothing new); used by the auto-extend job.
   * The caller has already resolved ownership. Returns the number created. */
  async createSkippingOverlaps(
    venueId: string,
    ownerUserId: string,
    slots: Array<{ start_at: string; end_at: string; notes?: string; price?: number }>,
    maxAdvanceDays: number,
    holidays: string[] = []
  ): Promise<number> {
    const now = Date.now();
    const maxTs = now + maxAdvanceDays * 24 * 60 * 60 * 1000;
    const leaveDays = new Set(holidays);
    const prepared = slots
      .map((s) => ({
        start: new Date(s.start_at),
        end: new Date(s.end_at),
        notes: (s.notes ?? '').trim(),
        price: normalizePrice(s.price),
      }))
      .filter(
        (p) =>
          !Number.isNaN(p.start.getTime()) &&
          !Number.isNaN(p.end.getTime()) &&
          p.end.getTime() > p.start.getTime() &&
          p.start.getTime() >= now - 60_000 &&
          p.start.getTime() <= maxTs &&
          !leaveDays.has(venueLocalYmd(p.start))
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    if (!prepared.length) return 0;

    const existing = await VenueSlotModel.find({
      venue_id: new Types.ObjectId(venueId),
      start_at: { $lt: new Date(maxTs + 24 * 60 * 60 * 1000) },
      end_at: { $gt: new Date(now) },
    }).select('start_at end_at');

    const toInsert: typeof prepared = [];
    for (const p of prepared) {
      const collides =
        toInsert.some((q) => q.start < p.end && q.end > p.start) ||
        existing.some((e) => e.start_at < p.end && e.end_at > p.start);
      if (!collides) toInsert.push(p);
    }
    if (!toInsert.length) return 0;

    const docs = await VenueSlotModel.insertMany(
      toInsert.map((p) => ({
        venue_id: new Types.ObjectId(venueId),
        owner_user_id: new Types.ObjectId(ownerUserId),
        start_at: p.start,
        end_at: p.end,
        price: p.price,
        notes: p.notes,
        status: 'AVAILABLE',
      }))
    );
    return docs.length;
  },

  async update(userId: string, slotId: string, input: { start_at?: string; end_at?: string; notes?: string; block?: boolean; price?: number }) {
    const slot = await loadSlot(slotId);
    if (String(slot.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    const venue = await VenueModel.findById(slot.venue_id);
    return updateSlotCore(slot, input, venueSlotRules(venue));
  },

  async adminUpdate(slotId: string, input: { start_at?: string; end_at?: string; notes?: string; block?: boolean; price?: number }) {
    const slot = await loadSlot(slotId);
    const venue = await VenueModel.findById(slot.venue_id);
    return updateSlotCore(slot, input, venueSlotRules(venue));
  },

  async remove(userId: string, slotId: string) {
    const slot = await loadSlot(slotId);
    if (String(slot.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    return removeSlotCore(slot);
  },

  async adminRemove(slotId: string) {
    const slot = await loadSlot(slotId);
    return removeSlotCore(slot);
  },

  /** Bulk-delete a venue's upcoming non-booked slots matching the filter
   * (future / date-range / weekdays). Booked slots are never deleted. */
  async bulkDelete(
    userId: string,
    input: { venue_id: string; from?: string; to?: string; weekdays?: number[] }
  ) {
    await ensureOwnedVenue(userId, input.venue_id);
    const slots = await matchingBulkSlots(input.venue_id, input.from, input.to, input.weekdays);
    if (!slots.length) return { matched: 0, affected: 0, skipped: 0 };
    const ids = slots.map((s) => s._id);
    const r = await VenueSlotModel.deleteMany({ _id: { $in: ids } });
    return { matched: slots.length, affected: r.deletedCount ?? 0, skipped: 0 };
  },

  /** Bulk-update a venue's upcoming non-booked slots: set price and/or
   * enable/disable (atomic), and/or shift time / set duration (per-slot,
   * skipping any that would fall out of range or collide). */
  async bulkUpdate(
    userId: string,
    input: {
      venue_id: string;
      from?: string;
      to?: string;
      weekdays?: number[];
      set_price?: number;
      block?: boolean;
      shift_minutes?: number;
      set_duration_minutes?: number;
    }
  ) {
    const venue = await ensureOwnedVenue(userId, input.venue_id);
    const slots = await matchingBulkSlots(input.venue_id, input.from, input.to, input.weekdays);
    if (!slots.length) return { matched: 0, affected: 0, skipped: 0 };
    const rules = venueSlotRules(venue);

    const set: { price?: number; status?: VenueSlotStatus } = {};
    if (input.set_price !== undefined) set.price = normalizePrice(input.set_price);
    if (input.block !== undefined) set.status = input.block ? 'BLOCKED' : 'AVAILABLE';
    const shiftsTime = input.shift_minutes !== undefined || input.set_duration_minutes !== undefined;

    if (!shiftsTime) return bulkSetFields(slots, set);

    let affected = 0;
    let skipped = 0;
    for (const slot of slots) {
      const shifted = await bulkShiftedWindow(slot, input, rules);
      if (!shifted) {
        skipped += 1;
        continue;
      }
      slot.start_at = shifted.start;
      slot.end_at = shifted.end;
      if (set.price !== undefined) slot.price = set.price;
      if (set.status !== undefined) slot.status = set.status;
      await (slot as any).save();
      affected += 1;
    }
    return { matched: slots.length, affected, skipped };
  },

  /** Atomic hold: AVAILABLE → PENDING for a pod that needs the venue owner's
   * approval before going live (host booking another partner's venue). */
  async holdForPod(slotId: string, venueId: string, podId: string): Promise<IVenueSlot> {
    if (!Types.ObjectId.isValid(slotId)) fail('BAD_USER_INPUT', 'Invalid slot_id');
    const updated = await VenueSlotModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(slotId),
        venue_id: new Types.ObjectId(venueId),
        status: 'AVAILABLE',
      },
      { $set: { status: 'PENDING', booked_by_pod_id: new Types.ObjectId(podId) } },
      { new: true }
    );
    if (!updated) fail('CONFLICT', 'This slot is no longer available. Pick another slot.');
    return updated!;
  },

  /** Owner: pending booking requests across their venues, newest first,
   * joined with the requesting pod and its host's contact details. */
  async listRequests(userId: string, venueId?: string | null) {
    const q: any = { status: 'PENDING', owner_user_id: new Types.ObjectId(userId) };
    if (venueId) {
      if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue_id');
      q.venue_id = new Types.ObjectId(venueId);
    }
    const slots = await VenueSlotModel.find(q).sort({ updated_at: -1 }).limit(200);
    if (!slots.length) return [];
    const podIds = slots.map((s) => s.booked_by_pod_id).filter(Boolean);
    const pods = await PodModel.find({ _id: { $in: podIds } }).select(
      'pod_title pod_description pod_hosts_id'
    );
    const podMap = new Map(pods.map((p) => [String(p._id), p]));
    const hostIds = pods.flatMap((p) => (p.pod_hosts_id ?? []).slice(0, 1));
    const hosts = await UserModel.find({ _id: { $in: hostIds } })
      .select('profile.first_name profile.last_name auth.email auth.phone.number auth.phone.extension')
      .lean();
    const hostMap = new Map(hosts.map((u: any) => [String(u._id), u]));
    const venues = await VenueModel.find({ _id: { $in: slots.map((s) => s.venue_id) } }).select('venue_name');
    const venueMap = new Map(venues.map((v) => [String(v._id), v.venue_name || '']));

    return slots
      .filter((s) => s.booked_by_pod_id && podMap.has(String(s.booked_by_pod_id)))
      .map((s) => {
        const pod = podMap.get(String(s.booked_by_pod_id))!;
        const host: any = hostMap.get(String((pod.pod_hosts_id ?? [])[0])) ?? null;
        return toRequestRow(s, pod, host, venueMap.get(String(s.venue_id)) ?? '');
      });
  },

  /**
   * Owner: one booking request with the venue's money on it, for the decision
   * page the request email links to. Readable BEFORE and AFTER the decision —
   * `decided_pod_id` keeps the pod reachable once a decline clears the hold —
   * so a re-opened link shows the outcome instead of an error.
   */
  async decisionDetail(userId: string, slotId: string) {
    const slot = await loadSlot(slotId);
    if (String(slot.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    const podId = slot.booked_by_pod_id ?? slot.decided_pod_id;
    if (!podId) fail('NOT_FOUND', 'This slot has no booking request');

    const [pod, venue, rates] = await Promise.all([
      PodModel.findById(podId).select('pod_title pod_description pod_hosts_id'),
      VenueModel.findById(slot.venue_id).select('venue_name'),
      resolveEffectiveRates({ venueId: String(slot.venue_id) }),
    ]);
    if (!pod) fail('NOT_FOUND', 'The pod for this request no longer exists');

    const host: any = await UserModel.findById((pod!.pod_hosts_id ?? [])[0])
      .select('profile.first_name profile.last_name auth.email auth.phone.number auth.phone.extension')
      .lean();

    // Same rounding rule settlement uses, in paise, then back to rupees.
    const pricePaise = Math.round((slot.price ?? 0) * 100);
    const side = venueSideOf(pricePaise, rates.venue_commission_percent);

    return {
      ...toRequestRow(slot, pod, host, venue?.venue_name ?? ''),
      decision: slot.decision ?? 'NONE',
      decided_at: slot.decided_at ? slot.decided_at.toISOString() : null,
      decline_reason: slot.decline_reason ?? '',
      space_label: slot.space_label ?? '',
      venue_commission_pct: rates.venue_commission_percent,
      venue_commission_amount: side.commission_paise / 100,
      venue_receives: side.receives_paise / 100,
    };
  },

  /** Owner approves a pending request: slot PENDING → BOOKED, pod goes live. */
  async approveRequest(userId: string, slotId: string) {
    const slot = await loadSlot(slotId);
    if (String(slot.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    if (slot.status !== 'PENDING' || !slot.booked_by_pod_id) {
      fail('BAD_REQUEST', 'This slot has no pending booking request');
    }
    slot.status = 'BOOKED';
    slot.decision = 'APPROVED';
    slot.decided_at = new Date();
    slot.decided_pod_id = slot.booked_by_pod_id;
    slot.decline_reason = '';
    await (slot as any).save();
    const beforePod = await PodModel.findById(slot.booked_by_pod_id);
    const before = beforePod ? snapshotPod(beforePod) : null;
    const pod = await PodModel.findByIdAndUpdate(
      slot.booked_by_pod_id,
      { $set: { venue_approval_status: 'APPROVED', is_active: true } },
      { new: true }
    );
    if (pod) {
      await notifySlotDecision(pod, slot, true);
      await podAuditService.record({
        pod,
        action: 'VENUE_APPROVED',
        source: 'VENUE_OWNER',
        actorUserId: userId,
        before,
        note: 'Venue owner approved the slot booking request',
      });
    }
    return (await withVenueAndPod([slot]))[0];
  },

  /** Owner declines: slot frees back up, the pod stays offline as DECLINED. */
  async declineRequest(userId: string, slotId: string, reason?: string | null) {
    const slot = await loadSlot(slotId);
    if (String(slot.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    if (slot.status !== 'PENDING' || !slot.booked_by_pod_id) {
      fail('BAD_REQUEST', 'This slot has no pending booking request');
    }
    const podId = slot.booked_by_pod_id;
    slot.status = 'AVAILABLE';
    slot.booked_by_pod_id = null;
    // Keep the decision on the slot: `booked_by_pod_id` is cleared above, so
    // without this the decision page has nothing to render after a decline.
    slot.decision = 'DECLINED';
    slot.decided_at = new Date();
    slot.decided_pod_id = podId;
    slot.decline_reason = reason?.trim() ?? '';
    await (slot as any).save();
    const beforePod = await PodModel.findById(podId);
    const before = beforePod ? snapshotPod(beforePod) : null;
    const pod = await PodModel.findByIdAndUpdate(
      podId,
      { $set: { venue_approval_status: 'DECLINED', is_active: false, venue_slot_id: null } },
      { new: true }
    );
    if (pod) {
      await notifySlotDecision(pod, slot, false, reason);
      await podAuditService.record({
        pod,
        action: 'VENUE_DECLINED',
        source: 'VENUE_OWNER',
        actorUserId: userId,
        before,
        note: reason?.trim() || 'Venue owner declined the slot booking request',
      });
    }
    return (await withVenueAndPod([slot]))[0];
  },

  // Atomic: only succeeds if the slot is currently AVAILABLE. Called from pod
  // creation. Returns the updated slot or throws on conflict.
  async bookForPod(slotId: string, venueId: string, podId: string): Promise<IVenueSlot> {
    if (!Types.ObjectId.isValid(slotId)) fail('BAD_USER_INPUT', 'Invalid slot_id');
    const updated = await VenueSlotModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(slotId),
        venue_id: new Types.ObjectId(venueId),
        status: 'AVAILABLE',
      },
      { $set: { status: 'BOOKED', booked_by_pod_id: new Types.ObjectId(podId) } },
      { new: true }
    );
    if (!updated) fail('CONFLICT', 'This slot is no longer available. Pick another slot.');
    return updated!;
  },

  /**
   * A venue accepting an Auto Pod claims its own slot outright: there is no pod
   * to approve later, because the venue's acceptance IS the approval. Keyed on
   * `booked_by_auto_pod_id` so the offer holds the slot for the whole
   * host/club-admin enrolment window and no ordinary pod can book it.
   */
  async bookForAutoPod(
    slotId: string,
    venueId: string,
    ownerUserId: string,
    autoPodId: string
  ): Promise<IVenueSlot> {
    if (!Types.ObjectId.isValid(slotId)) fail('BAD_USER_INPUT', 'Invalid slot_id');
    const updated = await VenueSlotModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(slotId),
        venue_id: new Types.ObjectId(venueId),
        owner_user_id: new Types.ObjectId(ownerUserId),
        status: 'AVAILABLE',
      },
      { $set: { status: 'BOOKED', booked_by_auto_pod_id: new Types.ObjectId(autoPodId) } },
      { new: true }
    );
    if (!updated) fail('CONFLICT', 'This slot is no longer available. Pick another slot.');
    return updated!;
  },

  /**
   * Hand the booking from the Auto Pod to the pod it just became. One
   * conditional write, so the slot is never AVAILABLE in between — the same
   * claim-then-release ordering every other re-route obeys. The decision fields
   * are stamped because the venue really did approve this booking.
   */
  async transferAutoPodHold(slotId: string, autoPodId: string, podId: string): Promise<void> {
    const moved = await VenueSlotModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(slotId),
        booked_by_auto_pod_id: new Types.ObjectId(autoPodId),
      },
      {
        $set: {
          status: 'BOOKED',
          booked_by_pod_id: new Types.ObjectId(podId),
          booked_by_auto_pod_id: null,
          decision: 'APPROVED',
          decided_at: new Date(),
          decided_pod_id: new Types.ObjectId(podId),
        },
      },
      { new: true }
    );
    if (!moved) fail('CONFLICT', 'This slot is no longer held by that Auto Pod.');
  },

  /**
   * Free ONE slot this Auto Pod holds. Used to compensate a venue that booked
   * its slot and then lost the race to accept the offer: matching on the slot id
   * AND the auto-pod id means it can only ever free the slot THAT attempt
   * booked, never the winning venue's — which the blanket release below would.
   */
  async releaseAutoPodSlot(slotId: string, autoPodId: string): Promise<void> {
    await VenueSlotModel.updateOne(
      {
        _id: new Types.ObjectId(slotId),
        booked_by_auto_pod_id: new Types.ObjectId(autoPodId),
      },
      { $set: { status: 'AVAILABLE', booked_by_auto_pod_id: null } }
    );
  },

  /** Free the slot an Auto Pod held (cancelled or expired before it went live). */
  async releaseForAutoPod(autoPodId: string): Promise<void> {
    await VenueSlotModel.updateMany(
      { booked_by_auto_pod_id: new Types.ObjectId(autoPodId) },
      { $set: { status: 'AVAILABLE', booked_by_auto_pod_id: null } }
    );
  },

  // Release any slot tied to a pod (called when the pod is deleted/cancelled).
  async releaseForPod(podId: string): Promise<void> {
    await VenueSlotModel.updateMany(
      { booked_by_pod_id: new Types.ObjectId(podId) },
      { $set: { status: 'AVAILABLE', booked_by_pod_id: null } }
    );
  },

  /** Release ONE slot the pod holds — used when a re-route has already secured
   * a replacement, so the blanket release would free the new seat too. Matching
   * on booked_by_pod_id keeps it a no-op if the slot moved on meanwhile.
   * `slotId` always comes from a pod's stored venue_slot_id, so it is a valid id. */
  async releaseSlotForPod(slotId: string, podId: string): Promise<void> {
    await VenueSlotModel.updateOne(
      { _id: new Types.ObjectId(slotId), booked_by_pod_id: new Types.ObjectId(podId) },
      { $set: { status: 'AVAILABLE', booked_by_pod_id: null } }
    );
  },

  /** Atomic external booking (public developer API): AVAILABLE → BOOKED keyed
   * on the API key, not a pod. Returns null when the slot is not available so
   * the REST layer can answer 409. */
  async bookExternal(
    slotId: string,
    apiKeyId: string,
    externalRef?: string | null
  ): Promise<IVenueSlot | null> {
    if (!Types.ObjectId.isValid(slotId)) return null;
    return VenueSlotModel.findOneAndUpdate(
      { _id: new Types.ObjectId(slotId), status: 'AVAILABLE' },
      {
        $set: {
          status: 'BOOKED',
          booked_by_api_key_id: new Types.ObjectId(apiKeyId),
          external_ref: String(externalRef ?? '').trim().slice(0, 120),
        },
      },
      { new: true }
    );
  },

  /** Release an external booking — a key can only cancel its OWN bookings.
   * Returns null when the slot is not booked by this key (caller → 409). */
  async releaseExternal(slotId: string, apiKeyId: string): Promise<IVenueSlot | null> {
    if (!Types.ObjectId.isValid(slotId)) return null;
    return VenueSlotModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(slotId),
        status: 'BOOKED',
        booked_by_api_key_id: new Types.ObjectId(apiKeyId),
      },
      { $set: { status: 'AVAILABLE', booked_by_api_key_id: null, external_ref: '' } },
      { new: true }
    );
  },
};
