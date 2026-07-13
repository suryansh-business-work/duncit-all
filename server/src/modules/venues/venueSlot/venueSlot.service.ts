import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueSlotModel, type IVenueSlot, type VenueSlotStatus } from './venueSlot.model';
import { VenueModel, type IVenue } from '@modules/venues/venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { venueLocalYmd } from '@modules/venues/autoExtend/slotGenerator';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

async function ensureOwnedVenue(userId: string, venueId: string) {
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

function validateSlotWindow(start: Date, end: Date, rules: SlotRules) {
  if (end.getTime() <= start.getTime()) fail('BAD_USER_INPUT', 'end_at must be after start_at');
  if (start.getTime() < Date.now() - 60_000) fail('BAD_USER_INPUT', 'Cannot create slots in the past');
  if (start.getTime() > Date.now() + rules.maxAdvanceDays * 24 * 60 * 60 * 1000) {
    fail('BAD_USER_INPUT', `Slots can only be scheduled up to ${rules.maxAdvanceDays} days in advance`);
  }
  if (rules.holidays.has(venueLocalYmd(start))) {
    fail('BAD_REQUEST', `${venueLocalYmd(start)} is marked as a venue leave/holiday`);
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

// Core create/update/delete shared by the owner-scoped methods (partner editing
// their own venue) and the admin methods (onboarding editing any venue). The
// caller is responsible for the ownership/role check before invoking these.
async function createSlotsCore(
  venueId: string,
  ownerUserId: string,
  slots: Array<{
    start_at: string;
    end_at: string;
    notes?: string;
    price?: number;
    space_label?: string;
    capacity?: number;
  }>,
  rules: SlotRules
) {
  if (!slots?.length) fail('BAD_USER_INPUT', 'At least one slot is required');

  const prepared = slots.map((s) => {
    const start = parseDate(s.start_at, 'start_at');
    const end = parseDate(s.end_at, 'end_at');
    validateSlotWindow(start, end, rules);
    return {
      start,
      end,
      notes: (s.notes ?? '').trim(),
      price: normalizePrice(s.price),
      space_label: (s.space_label ?? '').trim(),
      capacity: normalizeCapacity(s.capacity),
    };
  });

  // Reject when any new slot collides with an existing one in the SAME space
  // (any status) — different spaces may share a time window.
  for (const p of prepared) {
    const overlap = await findOverlap(venueId, p.start, p.end, p.space_label);
    if (overlap) {
      fail(
        'CONFLICT',
        `Overlaps with existing slot ${overlap.start_at.toISOString()} – ${overlap.end_at.toISOString()}`
      );
    }
  }
  // Reject overlaps within the batch itself, per space.
  const bySpace = new Map<string, typeof prepared>();
  for (const p of prepared) {
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

  const docs = await VenueSlotModel.insertMany(
    prepared.map((p) => ({
      venue_id: new Types.ObjectId(venueId),
      owner_user_id: new Types.ObjectId(ownerUserId),
      start_at: p.start,
      end_at: p.end,
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
    // eslint-disable-next-line no-console
    console.error('[venueSlot] decision notification failed:', err);
  }
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

  async create(
    userId: string,
    input: {
      venue_id: string;
      slots: Array<{ start_at: string; end_at: string; notes?: string; price?: number; space_label?: string; capacity?: number }>;
    }
  ) {
    const venue = await ensureOwnedVenue(userId, input.venue_id);
    return createSlotsCore(input.venue_id, userId, input.slots, venueSlotRules(venue));
  },

  // Admin create — slots are owned by the venue's actual owner, not the editor.
  async adminCreate(input: {
    venue_id: string;
    slots: Array<{ start_at: string; end_at: string; notes?: string; price?: number; space_label?: string; capacity?: number }>;
  }) {
    if (!Types.ObjectId.isValid(input.venue_id)) fail('BAD_USER_INPUT', 'Invalid venue_id');
    const venue = await VenueModel.findById(input.venue_id);
    if (!venue) fail('NOT_FOUND', 'Venue not found');
    return createSlotsCore(input.venue_id, String(venue!.owner_user_id), input.slots, venueSlotRules(venue));
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

  /** Owner approves a pending request: slot PENDING → BOOKED, pod goes live. */
  async approveRequest(userId: string, slotId: string) {
    const slot = await loadSlot(slotId);
    if (String(slot.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    if (slot.status !== 'PENDING' || !slot.booked_by_pod_id) {
      fail('BAD_REQUEST', 'This slot has no pending booking request');
    }
    slot.status = 'BOOKED';
    await (slot as any).save();
    const pod = await PodModel.findByIdAndUpdate(
      slot.booked_by_pod_id,
      { $set: { venue_approval_status: 'APPROVED', is_active: true } },
      { new: true }
    );
    if (pod) {
      await notifySlotDecision(pod, slot, true);
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
    await (slot as any).save();
    const pod = await PodModel.findByIdAndUpdate(
      podId,
      { $set: { venue_approval_status: 'DECLINED', is_active: false, venue_slot_id: null } },
      { new: true }
    );
    if (pod) {
      await notifySlotDecision(pod, slot, false, reason);
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

  // Release any slot tied to a pod (called when the pod is deleted/cancelled).
  async releaseForPod(podId: string): Promise<void> {
    await VenueSlotModel.updateMany(
      { booked_by_pod_id: new Types.ObjectId(podId) },
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
