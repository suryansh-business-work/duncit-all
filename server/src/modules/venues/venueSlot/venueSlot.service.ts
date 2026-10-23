import { GraphQLError } from 'graphql';
import { SLOT_PRICING_MODES, pricingModeOf, slotVenueCharge, type SlotPricingMode } from './slotCharge';
import { logs } from '@observability/log';
import { Types } from 'mongoose';
import { VenueSlotModel, type IVenueSlot, type VenueSlotStatus } from './venueSlot.model';
import { VenueModel, type IVenue } from '@modules/venues/venue/venue.model';
import { notifyVenueSubscribers } from '@modules/venues/venueFood/venueSubscriber.service';
import { fulfilEventRequests } from '@modules/venues/eventRequest/eventRequest.fulfil';
import { isFreePod, PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { venueLocalYmd } from '@modules/venues/autoExtend/slotGenerator';
import { podAuditService, snapshotPod } from '@modules/pods/podAudit/podAudit.service';
import { venueSideOf } from '@modules/finance/finance/breakdown.math';
import { resolveEffectiveRates } from '@modules/finance/finance/settlement.service';
import { notifyEach, type NotifyInput } from '@services/notify/notify.service';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import type { SendAssets } from '@modules/platform/whatsapp/whatsapp.media';
import { getUrlConfigs } from '@config/url-configs';
import { appDate, appDateTime, appTime } from '@utils/app-time';
import { currentTerms, offerView } from '@modules/venues/venueOffer/venueOffer.view';
import type { VenueOfferAction, VenueOfferParty } from '@modules/venues/venueOffer/venueOffer.types';

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
  pricing_mode: pricingModeOf(s.pricing_mode),
  overtime_rate: s.overtime_rate ?? 0,
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
    pricing_mode?: string | null;
    overtime_rate?: number | null;
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

/** The pricing mode as sent, or FLAT; an unknown one is refused, not guessed. */
function normalizePricingMode(value: unknown): SlotPricingMode {
  if (value === undefined || value === null || value === '') return 'FLAT';
  if (!SLOT_PRICING_MODES.includes(value as SlotPricingMode)) fail('BAD_USER_INPUT', 'Choose a valid pricing mode');
  return value as SlotPricingMode;
}

/** Overtime per hour in whole rupees — 0 (none) to 100,000. */
function normalizeOvertimeRate(value: unknown): number {
  const n = Math.round(Number(value) || 0);
  if (n < 0 || n > 100_000) fail('BAD_USER_INPUT', 'The overtime rate must be from 0 to 100000');
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

/** A slot a retired recurring pod asked the venue to open, not yet approved —
 * never the venue's to offer. */
const UNAPPROVED_HOST_REQUEST = { requested_by_host: true, decision: { $ne: 'APPROVED' } };

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
  pricing_mode: SlotPricingMode;
  overtime_rate: number;
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
      pricing_mode: normalizePricingMode(s.pricing_mode),
      overtime_rate: normalizeOvertimeRate(s.overtime_rate),
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
      pricing_mode: p.pricing_mode,
      overtime_rate: p.overtime_rate,
      space_label: p.space_label,
      capacity: p.capacity,
      notes: p.notes,
      status: 'AVAILABLE',
    }))
  );
  return withVenueAndPod(docs as IVenueSlot[]);
}

interface SlotUpdateInput {
  start_at?: string;
  end_at?: string;
  notes?: string;
  block?: boolean;
  price?: number;
  pricing_mode?: string | null;
  overtime_rate?: number | null;
}

/** Moves the slot to its new start/end (either may be kept), refusing a window that breaks the rules or overlaps another slot. */
async function moveSlotWindow(slot: IVenueSlot, input: SlotUpdateInput, rules: SlotRules) {
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

async function updateSlotCore(slot: IVenueSlot, input: SlotUpdateInput, rules: SlotRules) {
  if (slot.status === 'BOOKED') {
    fail('BAD_REQUEST', 'Booked slots cannot be edited. Cancel the pod first.');
  }
  if (slot.status === 'PENDING') {
    fail('BAD_REQUEST', 'This slot has a pending booking request. Approve or decline it first.');
  }
  if (input.start_at !== undefined || input.end_at !== undefined) {
    await moveSlotWindow(slot, input, rules);
  }
  if (input.notes !== undefined) slot.notes = (input.notes ?? '').trim();
  if (input.price !== undefined) slot.price = normalizePrice(input.price);
  if (input.pricing_mode !== undefined && input.pricing_mode !== null) {
    slot.pricing_mode = normalizePricingMode(input.pricing_mode);
  }
  if (input.overtime_rate !== undefined && input.overtime_rate !== null) {
    slot.overtime_rate = normalizeOvertimeRate(input.overtime_rate);
  }
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
const waWhen = (at: Date) => ({ date: appDate(at), time: appTime(at) });

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
  /** The pod's own pictures — the header asset every message below carries, so
   * a slot decision is headed by the pod rather than by a placeholder. */
  assets: SendAssets;
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
      assets: facts.assets,
      params: [name, facts.podTitle, facts.podTitle, facts.date, facts.time, facts.venueName, facts.podTitle],
    };
  });
}

/** The same decision back to the venue owner who made it — the approval also
 * carries the Venue Studio link, the rejection does not. */
async function venueDecisionSends(facts: SlotDecisionFacts, approved: boolean): Promise<NotifyInput[]> {
  if (!facts.owner) return [];
  const name = contactName(facts.owner);
  const to = { entityId: facts.entityId, user: facts.owner, name, assets: facts.assets };
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

/** Who looks after a pod whose club has no club admin. */
const NO_CLUB_ADMIN = 'the Duncit team';

/** "Your pod is live" to both sides of the booking — one campaign, one key per
 * audience. Only the primary host is told; the co-hosts already have the
 * approval message above. */
async function podPublishedSends(facts: SlotDecisionFacts): Promise<NotifyInput[]> {
  // The template names the club admin the pod was handed to. A club with none
  // is run by Duncit itself, and saying so beats the old behaviour — telling
  // neither the venue nor the host that their pod went live at all.
  const clubAdmin = (await clubAdminName(facts.clubId)) || NO_CLUB_ADMIN;
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
      assets: facts.assets,
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
      assets: facts.assets,
      params: [facts.hostName, ...details],
    });
  }
  return sends;
}

/** The pod fields the decision templates read. */
interface SlotDecisionPod {
  _id: unknown;
  pod_title?: string | null;
  club_id?: unknown;
  pod_hosts_id?: unknown[] | null;
  pod_images_and_videos?: Parameters<typeof podImageAssets>[0];
}

/** Everything the decision templates fill for one pod on one slot, or null
 * when the venue has gone. Shared by a venue's decision and by a free pod's
 * instant booking, so both fill the same templates from the same lookups. */
async function loadSlotDecisionFacts(pod: SlotDecisionPod, slot: IVenueSlot): Promise<SlotDecisionFacts | null> {
  const venue = await VenueModel.findById(slot.venue_id).select('venue_name owner_user_id').lean();
  if (!venue) return null;
  const [hosts, owner] = await Promise.all([
    UserModel.find({ _id: { $in: pod.pod_hosts_id ?? [] } })
      .select(WA_CONTACT_FIELDS)
      .lean(),
    UserModel.findById(venue.owner_user_id).select(WA_CONTACT_FIELDS).lean(),
  ]);
  const { date, time } = waWhen(slot.start_at);
  return {
    entityId: String(pod._id),
    podTitle: pod.pod_title ?? '',
    venueName: venue.venue_name ?? '',
    clubId: pod.club_id,
    hostName: contactName(hosts[0]),
    date,
    time,
    hosts,
    owner,
    assets: podImageAssets(pod.pod_images_and_videos),
  };
}

/** The pod is live: the open event requests to its venue and its hosts are
 * answered and their members told in the app. Queues and returns; never throws. */
function answerEventRequests(facts: SlotDecisionFacts, slot: IVenueSlot) {
  fulfilEventRequests({
    podId: facts.entityId,
    podTitle: facts.podTitle,
    venueId: slot.venue_id,
    venueName: facts.venueName,
    hostIds: facts.hosts.map((host) => host?._id),
    hostName: facts.hostName,
    date: facts.date,
    time: facts.time,
  });
}

/** Best-effort WhatsApp beside the in-app note: the decision to the hosts and
 * to the venue owner, plus the pod-is-live pair once it is approved. The sends
 * themselves never throw; the lookups feeding them can. */
async function whatsappSlotDecision(
  pod: any,
  slot: IVenueSlot,
  approved: boolean,
  tellOwner = true
) {
  try {
    const facts = await loadSlotDecisionFacts(pod, slot);
    if (!facts) return;
    // First, so a failed message below never leaves a request unanswered.
    if (approved) answerEventRequests(facts, slot);
    const sends = [
      ...hostDecisionSends(facts, approved),
      ...(tellOwner ? await venueDecisionSends(facts, approved) : []),
    ];
    if (approved) sends.push(...(await podPublishedSends(facts)));
    // `notifyEach`, not `sendEach`: the same four decisions now also go out as
    // `host-slot-approved`, `venue-slot-approved`, `host-pod-published` and
    // their declined twins, filled from the very same `params` array. The
    // address comes off each account's own `auth.email`, already projected.
    await notifyEach(sends);
    // The pod is live: whoever asked to hear about this venue's events is told.
    // It queues and returns — the fan-out never holds the approval open.
    if (approved) {
      await notifyVenueSubscribers({
        venueId: slot.venue_id,
        venueName: facts.venueName,
        podId: facts.entityId,
        podTitle: facts.podTitle,
        date: facts.date,
        time: facts.time,
        podImageUrl: facts.assets.IMAGE?.url,
      });
    }
  } catch (err) {
    logs.server.error('venueSlot', 'whatsappSlotDecision', {
      error: err,
      msg: 'decision whatsapp failed',
      approved,
      slot_id: String(slot._id),
    });
  }
}

/**
 * Best-effort in-app note to the pod's hosts when a venue decides a request.
 *
 * `tellOwner` is false for a decline the venue owner did not make. Their copy
 * is subjected "You declined a slot", which would be a false account of their
 * own actions when the deadline decided it for them — and there is no template
 * yet that says what actually happened, so the honest choice is silence on that
 * side rather than a wrong sentence. The HOST is always told either way: their
 * pod just went offline and that is not optional news.
 */
async function notifySlotDecision(
  pod: any,
  slot: IVenueSlot,
  approved: boolean,
  reason?: string | null,
  tellOwner = true
) {
  try {
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    const when = appDateTime(slot.start_at);
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
  await whatsappSlotDecision(pod, slot, approved, tellOwner);
}

/**
 * A FREE pod just booked a partner's ₹0 slot outright — no request, because a
 * free slot costs the free pod nothing and the venue asked nothing for it.
 *
 * The venue is told the way a live booking at its venue is always told: an
 * in-app note, and the existing "pod is live" pair (VENUE_POD_PUBLISHED to the
 * owner, HOST_POD_PUBLISHED to the host). Deliberately NOT the "you approved"
 * message — the owner approved nothing, and that copy would say they did.
 * Best-effort: a failed message never undoes the booking.
 */
export async function notifyFreeSlotBooked(pod: SlotDecisionPod, slot: IVenueSlot) {
  await announceLiveBooking(
    pod,
    slot,
    'Slot booked',
    `"${pod.pod_title}" is a free pod and booked your free slot on ${appDateTime(slot.start_at)}. It is live now.`
  );
}

/**
 * A host booked the venue instantly at the venue's own price — there is no
 * request to answer any more. Told the same way as a free-slot booking: an
 * in-app note (push) to the owner plus the "pod is live" pair. Best-effort.
 */
export async function notifyInstantBooking(pod: SlotDecisionPod, slot: IVenueSlot, freePodNotice = '') {
  // A free pod pays the venue nothing through Duncit: say so instead of a payout.
  let payout = '';
  if (freePodNotice) payout = ` ${freePodNotice}`;
  else if (slot.price_snapshot) payout = ` You receive ₹${slot.price_snapshot.venue_payout}.`;
  await announceLiveBooking(
    pod,
    slot,
    'New booking confirmed',
    `"${pod.pod_title}" booked your venue for ${appDateTime(slot.start_at)}.${payout} It is confirmed and live.`
  );
}

async function announceLiveBooking(pod: SlotDecisionPod, slot: IVenueSlot, title: string, body: string) {
  try {
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.create({
      title,
      body,
      scope: 'USER',
      target_user_ids: [String(slot.owner_user_id)],
      silent: false,
    });
  } catch (err) {
    logs.server.error('venueSlot', 'announceLiveBooking', { error: err, msg: 'booking note failed', slot_id: String(slot._id) });
  }
  try {
    const facts = await loadSlotDecisionFacts(pod, slot);
    if (facts) {
      answerEventRequests(facts, slot);
      await notifyEach(await podPublishedSends(facts));
    }
  } catch (err) {
    logs.server.error('venueSlot', 'announceLiveBooking', { error: err, msg: 'booking whatsapp failed', slot_id: String(slot._id) });
  }
}

/** One pending booking request row: the slot joined with its requesting pod,
 * that pod's first host's contact details and the venue name. */
/** Who is turning the request down, and what the audit row says when the
 * decline carries no reason of its own. */
export interface DeclineActor {
  source: 'VENUE_OWNER' | 'HOST' | 'SYSTEM';
  actorUserId: string | null;
  fallbackNote: string;
}

/** Who confirmed a booking: the venue owner accepting, or the host accepting the venue's counter offer. */
export interface ApproveActor {
  source: 'VENUE_OWNER' | 'HOST';
  actorUserId: string;
  note: string;
}

/**
 * The ONE write that turns a pending request down.
 *
 * A decline is four facts that have to move together — the slot frees up, the
 * pod comes out of PENDING and goes offline, the host is told, and the trail
 * records who did it. The venue owner's decline and the deadline sweep are the
 * two ways in (rule 41's shape); a second copy of this is how one of those four
 * would quietly stop happening on one of the paths.
 *
 * The caller has already established that the slot is PENDING with a pod on it.
 */
export async function applyDecline(slot: IVenueSlot, reason: string, actor: DeclineActor) {
  const podId = slot.booked_by_pod_id;
  const note = reason.trim();
  if (slot.offer) recordOfferStep(slot, actor.source === 'HOST' ? 'HOST' : 'VENUE', 'REJECT', note);
  slot.status = 'AVAILABLE';
  slot.booked_by_pod_id = null;
  // Keep the decision on the slot: `booked_by_pod_id` is cleared above, so
  // without this the decision page has nothing to render after a decline.
  slot.decision = 'DECLINED';
  slot.decided_at = new Date();
  slot.decided_pod_id = podId;
  slot.decline_reason = note;
  // A slot made for a host's offer (or a retired recurring pod) was never the venue's: it goes.
  if (slot.requested_by_host) await VenueSlotModel.deleteOne({ _id: slot._id });
  else await (slot as any).save();
  const beforePod = await PodModel.findById(podId);
  const before = beforePod ? snapshotPod(beforePod) : null;
  const pod = await PodModel.findByIdAndUpdate(
    podId,
    { $set: { venue_approval_status: 'DECLINED', is_active: false, venue_slot_id: null } },
    { new: true }
  );
  if (!pod) return;
  if (actor.source === 'HOST') await tellVenueOwner(slot, 'Offer declined', `The host declined your counter offer for "${pod.pod_title}".`);
  else await notifySlotDecision(pod, slot, false, note, actor.source === 'VENUE_OWNER');
  await podAuditService.record({
    pod,
    action: 'VENUE_DECLINED',
    source: actor.source,
    actorUserId: actor.actorUserId,
    before,
    note: note || actor.fallbackNote,
  });
}

/** Appends one move to the offer's history. */
function recordOfferStep(slot: IVenueSlot, by: VenueOfferParty, action: VenueOfferAction, note = '') {
  const offer = slot.offer;
  if (!offer) return;
  const terms = currentTerms(offer);
  offer.history.push({ by, action, model: terms.model, rate: terms.rate, total: terms.quote.total, note, at: new Date() });
  slot.markModified('offer');
}

/** In-app note to the venue's owner. Best-effort: never fails the decision. */
async function tellVenueOwner(slot: IVenueSlot, title: string, body: string) {
  try {
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.create({ title, body, scope: 'USER', target_user_ids: [String(slot.owner_user_id)], silent: false });
  } catch (error) {
    logs.server.error('venueSlot', 'tellVenueOwner', { error, slot_id: String(slot._id) });
  }
}

/**
 * The ONE write that confirms a pending booking: the slot books, an offer's
 * agreed terms are frozen as the booking's price, the pod goes live, the host
 * is told and the trail records who did it. The venue accepting and the host
 * accepting the venue's counter are the two ways in.
 */
export async function applyApproval(slot: IVenueSlot, actor: ApproveActor) {
  if (slot.offer) {
    const terms = currentTerms(slot.offer);
    recordOfferStep(slot, actor.source === 'HOST' ? 'HOST' : 'VENUE', 'ACCEPT');
    slot.offer.status = 'ACCEPTED';
    slot.price_snapshot = { ...terms.quote, confirmed_at: new Date() };
    slot.price = terms.quote.venue_payout;
    // Extra hours at completion are priced at the hourly rate the two sides agreed.
    slot.overtime_rate = terms.model === 'PER_HOUR' ? terms.rate : 0;
    slot.markModified('offer');
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
  if (!pod) return;
  // The host accepting the venue's own counter: the venue hears it in-app,
  // never the "you approved" WhatsApp — the owner did not press approve.
  await notifySlotDecision(pod, slot, true, null, actor.source === 'VENUE_OWNER');
  if (actor.source === 'HOST') await tellVenueOwner(slot, 'Booking confirmed', `The host accepted your counter offer for "${pod.pod_title}". It is live now.`);
  await podAuditService.record({
    pod,
    action: 'VENUE_APPROVED',
    source: actor.source,
    actorUserId: actor.actorUserId,
    before,
    note: actor.note,
  });
}

/**
 * What a request pays the venue. An offer's terms are already priced: the
 * venue receives the full price and Duncit's commission rides on top. A legacy
 * slot's charge has the commission taken out of it, as it always did.
 */
function venueMoneyOf(slot: IVenueSlot, spots: number, commissionPct: number) {
  if (slot.offer) {
    const { quote } = currentTerms(slot.offer);
    return { pct: quote.platform_fee_pct, commission: quote.platform_fee, receives: quote.venue_payout };
  }
  // The slot's charge by its mode — per hour of its window, or per person at a
  // FULL pod (the most the venue can earn; the settlement uses real pax).
  const charge = slotVenueCharge(slot, { pax: spots });
  const side = venueSideOf(Math.round(charge.total * 100), commissionPct);
  return { pct: commissionPct, commission: side.commission_paise / 100, receives: side.receives_paise / 100 };
}

function toRequestRow(s: IVenueSlot, pod: any, host: any, venueName: string) {
  const hostName = host
    ? `${host.profile?.first_name ?? ''} ${host.profile?.last_name ?? ''}`.trim()
    : '';
  // A free pod's host pays the venue directly, off the platform — the request
  // quotes the venue no money, so no client can print "you receive ₹X" for it.
  const free = isFreePod(pod);
  return {
    slot_id: String(s._id),
    venue_id: String(s.venue_id),
    venue_name: venueName,
    start_at: s.start_at.toISOString(),
    end_at: s.end_at.toISOString(),
    whole_day: s.whole_day ?? false,
    price: free ? 0 : s.price ?? 0,
    pricing_mode: pricingModeOf(s.pricing_mode),
    overtime_rate: free ? 0 : s.overtime_rate ?? 0,
    pod_is_free: free,
    requested_at: s.updated_at?.toISOString() ?? '',
    pod_id: String(pod._id),
    pod_title: pod.pod_title ?? '',
    pod_description: pod.pod_description ?? '',
    host_name: hostName,
    host_email: host?.auth?.email ?? '',
    host_phone: `${host?.auth?.phone?.extension ?? ''}${host?.auth?.phone?.number ?? ''}`,
    offer: s.offer ? offerView(s) : null,
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

  async listAvailable(venueId: string, from?: string | null, heldForRequestId?: string | null) {
    if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue_id');
    const venue = await VenueModel.findOne({
      _id: venueId,
      status: 'APPROVED',
      is_active: true,
    });
    if (!venue) fail('NOT_FOUND', 'Venue not found or not approved');
    const cutoff = from ? parseDate(from, 'from') : new Date();
    // A Pod Request's own held slot is bookable for that request's host only.
    const bookable = heldForRequestId
      ? { $or: [{ status: 'AVAILABLE' }, { booked_by_partner_request_id: new Types.ObjectId(heldForRequestId) }] }
      : { status: 'AVAILABLE' };
    const docs = await VenueSlotModel.find({
      venue_id: new Types.ObjectId(venueId),
      ...bookable,
      start_at: { $gte: cutoff },
      $nor: [UNAPPROVED_HOST_REQUEST],
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
    const q: any = {
      status: 'PENDING',
      owner_user_id: new Types.ObjectId(userId),
      // Only what the owner can still decide. A request whose slot has begun is
      // already settled — the sweep declines it — and leaving it on the page
      // labelled "Awaiting decision" invites a decision that cannot be made.
      start_at: { $gt: new Date() },
    };
    if (venueId) {
      if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue_id');
      q.venue_id = new Types.ObjectId(venueId);
    }
    const slots = await VenueSlotModel.find(q).sort({ updated_at: -1 }).limit(200);
    if (!slots.length) return [];
    const podIds = slots.map((s) => s.booked_by_pod_id).filter(Boolean);
    const pods = await PodModel.find({ _id: { $in: podIds } }).select(
      'pod_title pod_description pod_hosts_id pod_type'
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
      PodModel.findById(podId).select(
        'pod_title pod_description pod_hosts_id pod_type no_of_spots'
      ),
      VenueModel.findById(slot.venue_id).select('venue_name'),
      resolveEffectiveRates({ venueId: String(slot.venue_id) }),
    ]);
    if (!pod) fail('NOT_FOUND', 'The pod for this request no longer exists');

    const host: any = await UserModel.findById((pod!.pod_hosts_id ?? [])[0])
      .select('profile.first_name profile.last_name auth.email auth.phone.number auth.phone.extension')
      .lean();

    // Same rounding rule settlement uses, in paise, then back to rupees. A
    // free pod quotes nothing: the host settles the venue directly.
    const money = isFreePod(pod)
      ? { pct: rates.venue_commission_percent, commission: 0, receives: 0 }
      : venueMoneyOf(slot, pod!.no_of_spots ?? 0, rates.venue_commission_percent);

    return {
      ...toRequestRow(slot, pod, host, venue?.venue_name ?? ''),
      decision: slot.decision ?? 'NONE',
      decided_at: slot.decided_at ? slot.decided_at.toISOString() : null,
      decline_reason: slot.decline_reason ?? '',
      space_label: slot.space_label ?? '',
      venue_commission_pct: money.pct,
      venue_commission_amount: money.commission,
      venue_receives: money.receives,
    };
  },

  /** Owner approves a pending request: slot PENDING → BOOKED, pod goes live. */
  async approveRequest(userId: string, slotId: string) {
    const slot = await loadSlot(slotId);
    if (String(slot.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    if (slot.status !== 'PENDING' || !slot.booked_by_pod_id) {
      fail('BAD_REQUEST', 'This slot has no pending booking request');
    }
    // The slot has already begun, so approving it would put a pod live for a
    // time that has been and gone. The sweep declines these, and this refuses
    // the owner who opens a stale page in the window before it runs.
    if (slot.start_at.getTime() <= Date.now()) {
      fail('BAD_REQUEST', 'This slot has already started and can no longer be approved');
    }
    // A countered offer waits on the host: the venue cannot accept its own counter.
    if (slot.offer && slot.offer.status !== 'SENT') {
      fail('BAD_REQUEST', 'The host is answering your counter offer');
    }
    await applyApproval(slot, {
      source: 'VENUE_OWNER',
      actorUserId: userId,
      note: slot.offer ? "Venue owner accepted the host's offer" : 'Venue owner approved the slot booking request',
    });
    return (await withVenueAndPod([slot]))[0];
  },

  /** Owner declines: slot frees back up, the pod stays offline as DECLINED. */
  async declineRequest(userId: string, slotId: string, reason?: string | null) {
    const slot = await loadSlot(slotId);
    if (String(slot.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    if (slot.status !== 'PENDING' || !slot.booked_by_pod_id) {
      fail('BAD_REQUEST', 'This slot has no pending booking request');
    }
    await applyDecline(slot, reason ?? '', {
      source: 'VENUE_OWNER',
      actorUserId: userId,
      fallbackNote: 'Venue owner declined the slot booking request',
    });
    return (await withVenueAndPod([slot]))[0];
  },

  /**
   * The deadline passing IS the decision.
   *
   * A request the venue never answered before the slot began cannot be
   * answered at all — the pod could not have run — so it is declined with that
   * as its reason rather than left in the queue. Same write as the owner's own
   * decline, so the host is told, the pod comes out of PENDING and the slot
   * frees up; only the actor differs. Called by the sweep in
   * `venueSlot.expiry.ts` and safe to call twice: the PENDING guard makes the
   * second call a no-op.
   */
  async expireRequest(slot: IVenueSlot, reason: string): Promise<boolean> {
    if (slot.status !== 'PENDING' || !slot.booked_by_pod_id) return false;
    await applyDecline(slot, reason, {
      source: 'SYSTEM',
      actorUserId: null,
      fallbackNote: reason,
    });
    return true;
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
    await VenueSlotModel.deleteMany({ booked_by_pod_id: new Types.ObjectId(podId), requested_by_host: true });
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
    await VenueSlotModel.deleteOne({
      _id: new Types.ObjectId(slotId),
      booked_by_pod_id: new Types.ObjectId(podId),
      requested_by_host: true,
    });
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
