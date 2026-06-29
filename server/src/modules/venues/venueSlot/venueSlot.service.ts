import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueSlotModel, type IVenueSlot, type VenueSlotStatus } from './venueSlot.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';

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

// Venue owners may publish availability up to this many days ahead — keeps the
// calendar finite and bookable windows realistic.
const MAX_FUTURE_DAYS = 60;

function validateSlotWindow(start: Date, end: Date) {
  if (end.getTime() <= start.getTime()) fail('BAD_USER_INPUT', 'end_at must be after start_at');
  if (start.getTime() < Date.now() - 60_000) fail('BAD_USER_INPUT', 'Cannot create slots in the past');
  if (start.getTime() > Date.now() + MAX_FUTURE_DAYS * 24 * 60 * 60 * 1000) {
    fail('BAD_USER_INPUT', `Slots can only be scheduled up to ${MAX_FUTURE_DAYS} days in advance`);
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

async function findOverlap(venueId: string, start: Date, end: Date, ignoreId?: string) {
  const q: any = {
    venue_id: new Types.ObjectId(venueId),
    start_at: { $lt: end },
    end_at: { $gt: start },
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
  slots: Array<{ start_at: string; end_at: string; notes?: string; price?: number }>
) {
  if (!slots?.length) fail('BAD_USER_INPUT', 'At least one slot is required');

  const prepared = slots.map((s) => {
    const start = parseDate(s.start_at, 'start_at');
    const end = parseDate(s.end_at, 'end_at');
    validateSlotWindow(start, end);
    return { start, end, notes: (s.notes ?? '').trim(), price: normalizePrice(s.price) };
  });

  // Reject when any new slot collides with an existing one (any status).
  for (const p of prepared) {
    const overlap = await findOverlap(venueId, p.start, p.end);
    if (overlap) {
      fail(
        'CONFLICT',
        `Overlaps with existing slot ${overlap.start_at.toISOString()} – ${overlap.end_at.toISOString()}`
      );
    }
  }
  // Reject overlaps within the batch itself.
  const sorted = [...prepared].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].start.getTime() < sorted[i - 1].end.getTime()) {
      fail('CONFLICT', 'Two of the new slots overlap with each other');
    }
  }

  const docs = await VenueSlotModel.insertMany(
    prepared.map((p) => ({
      venue_id: new Types.ObjectId(venueId),
      owner_user_id: new Types.ObjectId(ownerUserId),
      start_at: p.start,
      end_at: p.end,
      price: p.price,
      notes: p.notes,
      status: 'AVAILABLE' as VenueSlotStatus,
    }))
  );
  return withVenueAndPod(docs as IVenueSlot[]);
}

async function updateSlotCore(
  slot: IVenueSlot,
  input: { start_at?: string; end_at?: string; notes?: string; block?: boolean; price?: number }
) {
  if (slot.status === 'BOOKED') {
    fail('BAD_REQUEST', 'Booked slots cannot be edited. Cancel the pod first.');
  }
  if (input.start_at !== undefined || input.end_at !== undefined) {
    const start = input.start_at ? parseDate(input.start_at, 'start_at') : slot.start_at;
    const end = input.end_at ? parseDate(input.end_at, 'end_at') : slot.end_at;
    validateSlotWindow(start, end);
    const overlap = await findOverlap(String(slot.venue_id), start, end, String(slot._id));
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
  const q: any = { venue_id: new Types.ObjectId(venueId), status: { $ne: 'BOOKED' } };
  q.start_at = { $gte: from ? parseDate(from, 'from') : new Date() };
  if (to) q.start_at.$lte = parseDate(to, 'to');
  const docs = await VenueSlotModel.find(q).sort({ start_at: 1 }).limit(2000);
  if (!weekdays?.length) return docs;
  const set = new Set(weekdays);
  return docs.filter((s) => set.has(s.start_at.getDay()));
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
    return withVenueAndPod(docs);
  },

  async create(userId: string, input: { venue_id: string; slots: Array<{ start_at: string; end_at: string; notes?: string; price?: number }> }) {
    await ensureOwnedVenue(userId, input.venue_id);
    return createSlotsCore(input.venue_id, userId, input.slots);
  },

  // Admin create — slots are owned by the venue's actual owner, not the editor.
  async adminCreate(input: { venue_id: string; slots: Array<{ start_at: string; end_at: string; notes?: string; price?: number }> }) {
    if (!Types.ObjectId.isValid(input.venue_id)) fail('BAD_USER_INPUT', 'Invalid venue_id');
    const venue = await VenueModel.findById(input.venue_id);
    if (!venue) fail('NOT_FOUND', 'Venue not found');
    return createSlotsCore(input.venue_id, String(venue!.owner_user_id), input.slots);
  },

  async update(userId: string, slotId: string, input: { start_at?: string; end_at?: string; notes?: string; block?: boolean; price?: number }) {
    const slot = await loadSlot(slotId);
    if (String(slot.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    return updateSlotCore(slot, input);
  },

  async adminUpdate(slotId: string, input: { start_at?: string; end_at?: string; notes?: string; block?: boolean; price?: number }) {
    const slot = await loadSlot(slotId);
    return updateSlotCore(slot, input);
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
    await ensureOwnedVenue(userId, input.venue_id);
    const slots = await matchingBulkSlots(input.venue_id, input.from, input.to, input.weekdays);
    if (!slots.length) return { matched: 0, affected: 0, skipped: 0 };

    const set: { price?: number; status?: VenueSlotStatus } = {};
    if (input.set_price !== undefined) set.price = normalizePrice(input.set_price);
    if (input.block !== undefined) set.status = input.block ? 'BLOCKED' : 'AVAILABLE';
    const shiftsTime = input.shift_minutes !== undefined || input.set_duration_minutes !== undefined;

    if (!shiftsTime) {
      if (set.price === undefined && set.status === undefined) {
        fail('BAD_USER_INPUT', 'No bulk update specified');
      }
      const ids = slots.map((s) => s._id);
      const r = await VenueSlotModel.updateMany({ _id: { $in: ids } }, { $set: set });
      return { matched: slots.length, affected: r.modifiedCount ?? 0, skipped: 0 };
    }

    let affected = 0;
    let skipped = 0;
    for (const slot of slots) {
      let start = new Date(slot.start_at);
      let end = new Date(slot.end_at);
      if (input.shift_minutes !== undefined) {
        start = new Date(start.getTime() + input.shift_minutes * 60_000);
        end = new Date(end.getTime() + input.shift_minutes * 60_000);
      }
      if (input.set_duration_minutes !== undefined) {
        end = new Date(start.getTime() + input.set_duration_minutes * 60_000);
      }
      let windowOk = true;
      try {
        validateSlotWindow(start, end);
      } catch {
        windowOk = false; // out of range / past → skip this slot, keep the batch
      }
      if (!windowOk || (await findOverlap(String(slot.venue_id), start, end, String(slot._id)))) {
        skipped += 1;
        continue;
      }
      slot.start_at = start;
      slot.end_at = end;
      if (set.price !== undefined) slot.price = set.price;
      if (set.status !== undefined) slot.status = set.status;
      await (slot as any).save();
      affected += 1;
    }
    return { matched: slots.length, affected, skipped };
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
};
