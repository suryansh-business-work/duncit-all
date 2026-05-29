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

function validateSlotWindow(start: Date, end: Date) {
  if (end.getTime() <= start.getTime()) fail('BAD_USER_INPUT', 'end_at must be after start_at');
  if (start.getTime() < Date.now() - 60_000) fail('BAD_USER_INPUT', 'Cannot create slots in the past');
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

export const venueSlotService = {
  async listForVenue(viewerId: string, venueId: string, from?: string | null, to?: string | null) {
    const venue = await VenueModel.findById(venueId);
    if (!venue) fail('NOT_FOUND', 'Venue not found');
    // Owner sees everything; non-owners can only fetch via venueAvailableSlots.
    if (String(venue!.owner_user_id) !== viewerId) {
      fail('FORBIDDEN', 'Only the venue owner can view all slots');
    }
    const q: any = { venue_id: new Types.ObjectId(venueId) };
    if (from || to) q.start_at = {};
    if (from) q.start_at.$gte = parseDate(from, 'from');
    if (to) q.start_at.$lte = parseDate(to, 'to');
    const docs = await VenueSlotModel.find(q).sort({ start_at: 1 }).limit(500);
    return withVenueAndPod(docs);
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

  async create(userId: string, input: { venue_id: string; slots: Array<{ start_at: string; end_at: string; notes?: string }> }) {
    await ensureOwnedVenue(userId, input.venue_id);
    if (!input.slots?.length) fail('BAD_USER_INPUT', 'At least one slot is required');

    const prepared = input.slots.map((s) => {
      const start = parseDate(s.start_at, 'start_at');
      const end = parseDate(s.end_at, 'end_at');
      validateSlotWindow(start, end);
      return { start, end, notes: (s.notes ?? '').trim() };
    });

    // Reject when any new slot collides with an existing one (any status).
    for (const p of prepared) {
      const overlap = await findOverlap(input.venue_id, p.start, p.end);
      if (overlap) {
        fail(
          'CONFLICT',
          `Overlaps with existing slot ${overlap.start_at.toISOString()} – ${overlap.end_at.toISOString()}`
        );
      }
    }
    // Reject overlaps within the batch itself.
    const sorted = [...prepared].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start.getTime() < sorted[i - 1].end.getTime()) {
        fail('CONFLICT', 'Two of the new slots overlap with each other');
      }
    }

    const docs = await VenueSlotModel.insertMany(
      prepared.map((p) => ({
        venue_id: new Types.ObjectId(input.venue_id),
        owner_user_id: new Types.ObjectId(userId),
        start_at: p.start,
        end_at: p.end,
        notes: p.notes,
        status: 'AVAILABLE' as VenueSlotStatus,
      }))
    );
    return withVenueAndPod(docs as IVenueSlot[]);
  },

  async update(userId: string, slotId: string, input: { start_at?: string; end_at?: string; notes?: string; block?: boolean }) {
    if (!Types.ObjectId.isValid(slotId)) fail('BAD_USER_INPUT', 'Invalid slot_id');
    const slot = await VenueSlotModel.findById(slotId);
    if (!slot) fail('NOT_FOUND', 'Slot not found');
    if (String(slot!.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    if (slot!.status === 'BOOKED') {
      fail('BAD_REQUEST', 'Booked slots cannot be edited. Cancel the pod first.');
    }

    if (input.start_at !== undefined || input.end_at !== undefined) {
      const start = input.start_at ? parseDate(input.start_at, 'start_at') : slot!.start_at;
      const end = input.end_at ? parseDate(input.end_at, 'end_at') : slot!.end_at;
      validateSlotWindow(start, end);
      const overlap = await findOverlap(String(slot!.venue_id), start, end, slotId);
      if (overlap) {
        fail(
          'CONFLICT',
          `Overlaps with existing slot ${overlap.start_at.toISOString()} – ${overlap.end_at.toISOString()}`
        );
      }
      slot!.start_at = start;
      slot!.end_at = end;
    }
    if (input.notes !== undefined) slot!.notes = (input.notes ?? '').trim();
    if (input.block !== undefined) {
      slot!.status = input.block ? 'BLOCKED' : 'AVAILABLE';
    }
    await slot!.save();
    return (await withVenueAndPod([slot!]))[0];
  },

  async remove(userId: string, slotId: string) {
    if (!Types.ObjectId.isValid(slotId)) fail('BAD_USER_INPUT', 'Invalid slot_id');
    const slot = await VenueSlotModel.findById(slotId);
    if (!slot) fail('NOT_FOUND', 'Slot not found');
    if (String(slot!.owner_user_id) !== userId) fail('FORBIDDEN', 'Not your slot');
    if (slot!.status === 'BOOKED') {
      fail('BAD_REQUEST', 'Booked slots cannot be deleted. Cancel the pod first.');
    }
    await slot!.deleteOne();
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

  // Release any slot tied to a pod (called when the pod is deleted/cancelled).
  async releaseForPod(podId: string): Promise<void> {
    await VenueSlotModel.updateMany(
      { booked_by_pod_id: new Types.ObjectId(podId) },
      { $set: { status: 'AVAILABLE', booked_by_pod_id: null } }
    );
  },
};
