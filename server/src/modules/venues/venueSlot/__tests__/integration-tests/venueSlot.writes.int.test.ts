/**
 * The slot write paths the base suite does not reach: the SKIP / REPLACE
 * conflict modes, slot-span and self-overlap guards, rescheduling, booked-slot
 * protection, weekday-filtered and time-shifting bulk edits, the admin
 * (any-venue) variants, request guards, and the Auto Pod hold lifecycle.
 */
import { Types } from 'mongoose';
import { venueSlotService } from '../../venueSlot.service';
import { VenueSlotModel } from '../../venueSlot.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { venueLocalYmd } from '@modules/venues/autoExtend/slotGenerator';

const ownerId = new Types.ObjectId().toString();
const DAY_MS = 86_400_000;
const MIN_MS = 60_000;

/** `d` days ahead at noon venue time, so a short slot never crosses midnight. */
const inDays = (d: number) => {
  const whole = Math.floor(d);
  const ymd = venueLocalYmd(new Date(Date.now() + whole * DAY_MS));
  return new Date(new Date(`${ymd}T12:00:00+05:30`).getTime() + (d - whole) * DAY_MS).toISOString();
};

async function seedVenue() {
  const v = await VenueModel.create({ owner_user_id: ownerId, status: 'APPROVED', is_active: true, venue_name: 'Hall' });
  return String(v._id);
}

async function seedSlot(venueId: string, from: number, to: number, extra: Record<string, unknown> = {}) {
  const [slot] = await venueSlotService.create(ownerId, {
    venue_id: venueId,
    slots: [{ start_at: inDays(from), end_at: inDays(to), ...extra }],
  });
  return slot;
}

const markBooked = (slotId: string) => VenueSlotModel.updateOne({ _id: slotId }, { $set: { status: 'BOOKED' } });

describe('slot window guards', () => {
  it('refuses a slot spanning more than 60 days', async () => {
    const venueId = await seedVenue();
    await expect(
      venueSlotService.create(ownerId, { venue_id: venueId, slots: [{ start_at: inDays(1), end_at: inDays(62) }] })
    ).rejects.toMatchObject({ message: 'A slot cannot span more than 60 days', extensions: { code: 'BAD_USER_INPUT' } });
    expect(await VenueSlotModel.countDocuments({ venue_id: venueId })).toBe(0);
  });

  it('refuses two slots of one batch that claim the same space at once, in every mode', async () => {
    const venueId = await seedVenue();
    const slots = [
      { start_at: inDays(3), end_at: inDays(3.1) },
      { start_at: inDays(3.05), end_at: inDays(3.15) },
    ];
    for (const on_conflict of ['FAIL', 'SKIP', 'REPLACE'] as const) {
      await expect(venueSlotService.create(ownerId, { venue_id: venueId, slots, on_conflict })).rejects.toMatchObject({
        message: 'Two of the new slots overlap with each other',
        extensions: { code: 'CONFLICT' },
      });
    }
    expect(await VenueSlotModel.countDocuments({ venue_id: venueId })).toBe(0);
  });
});

describe('bulk create conflict modes', () => {
  it('SKIP keeps the existing slot and adds only the non-clashing ones', async () => {
    const venueId = await seedVenue();
    const existing = await seedSlot(venueId, 3, 3.1, { price: 100 });
    const created = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      on_conflict: 'SKIP',
      slots: [
        { start_at: inDays(3.05), end_at: inDays(3.15), price: 900 },
        { start_at: inDays(4), end_at: inDays(4.1), price: 200 },
      ],
    });
    expect(created.map((s) => s.start_at)).toEqual([inDays(4)]);
    const kept = await VenueSlotModel.findById(existing.id);
    expect(kept?.price).toBe(100);
    expect(await VenueSlotModel.countDocuments({ venue_id: venueId })).toBe(2);
  });

  it('SKIP with every slot already present says there is nothing to add', async () => {
    const venueId = await seedVenue();
    await seedSlot(venueId, 3, 3.1);
    await expect(
      venueSlotService.create(ownerId, {
        venue_id: venueId,
        on_conflict: 'SKIP',
        slots: [{ start_at: inDays(3), end_at: inDays(3.1) }],
      })
    ).rejects.toMatchObject({
      message: 'Every matching slot already exists — nothing to add.',
      extensions: { code: 'CONFLICT' },
    });
  });

  it('REPLACE deletes clashing open slots but never a booked one', async () => {
    const venueId = await seedVenue();
    const open = await seedSlot(venueId, 3, 3.1, { price: 100 });
    const booked = await seedSlot(venueId, 5, 5.1, { price: 300 });
    await markBooked(booked.id);

    const created = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      on_conflict: 'REPLACE',
      slots: [
        { start_at: inDays(3.02), end_at: inDays(3.12), price: 999 },
        { start_at: inDays(5.05), end_at: inDays(5.15), price: 999 },
      ],
    });

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ start_at: inDays(3.02), price: 999, status: 'AVAILABLE' });
    expect(await VenueSlotModel.findById(open.id)).toBeNull();
    const stillBooked = await VenueSlotModel.findById(booked.id);
    expect(stillBooked?.status).toBe('BOOKED');
    expect(stillBooked?.price).toBe(300);
    expect(await VenueSlotModel.countDocuments({ venue_id: venueId })).toBe(2);
  });

  it('REPLACE refuses when every new slot sits on a booked or pending slot', async () => {
    const venueId = await seedVenue();
    const booked = await seedSlot(venueId, 3, 3.1);
    await markBooked(booked.id);
    await expect(
      venueSlotService.create(ownerId, {
        venue_id: venueId,
        on_conflict: 'REPLACE',
        slots: [{ start_at: inDays(3), end_at: inDays(3.1) }],
      })
    ).rejects.toMatchObject({
      message: 'Every new slot overlaps a booked slot or a pending request, which cannot be replaced.',
      extensions: { code: 'CONFLICT' },
    });
    expect(await VenueSlotModel.countDocuments({ venue_id: venueId })).toBe(1);
  });
});

describe('editing and removing a slot', () => {
  it('reschedules into a free window, and refuses one that overlaps another slot', async () => {
    const venueId = await seedVenue();
    await seedSlot(venueId, 3, 3.1);
    const later = await seedSlot(venueId, 4, 4.1);

    const moved = await venueSlotService.update(ownerId, later.id, { start_at: inDays(6), end_at: inDays(6.1) });
    expect(moved).toMatchObject({ start_at: inDays(6), end_at: inDays(6.1) });

    // Only the end moves: the start is kept from the stored slot.
    const stretched = await venueSlotService.update(ownerId, later.id, { end_at: inDays(6.2) });
    expect(stretched).toMatchObject({ start_at: inDays(6), end_at: inDays(6.2) });

    await expect(
      venueSlotService.update(ownerId, later.id, { start_at: inDays(3.05), end_at: inDays(3.15) })
    ).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    const stored = await VenueSlotModel.findById(later.id);
    expect(stored?.start_at.toISOString()).toBe(inDays(6));
  });

  it('trims notes and toggles the block flag', async () => {
    const venueId = await seedVenue();
    const slot = await seedSlot(venueId, 3, 3.1);
    const blocked = await venueSlotService.update(ownerId, slot.id, { notes: '  Bring mats  ', block: true });
    expect(blocked).toMatchObject({ notes: 'Bring mats', status: 'BLOCKED' });
    const reopened = await venueSlotService.update(ownerId, slot.id, { block: false });
    expect(reopened.status).toBe('AVAILABLE');
  });

  it('refuses to edit or delete a booked slot, and to touch another owner’s slot', async () => {
    const venueId = await seedVenue();
    const slot = await seedSlot(venueId, 3, 3.1);
    await markBooked(slot.id);
    await expect(venueSlotService.update(ownerId, slot.id, { notes: 'x' })).rejects.toMatchObject({
      message: 'Booked slots cannot be edited. Cancel the pod first.',
      extensions: { code: 'BAD_REQUEST' },
    });
    await expect(venueSlotService.remove(ownerId, slot.id)).rejects.toMatchObject({
      message: 'Booked slots cannot be deleted. Cancel the pod first.',
      extensions: { code: 'BAD_REQUEST' },
    });
    const stranger = new Types.ObjectId().toString();
    await expect(venueSlotService.remove(stranger, slot.id)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(await VenueSlotModel.findById(slot.id)).not.toBeNull();
  });

  it('deletes an open slot', async () => {
    const venueId = await seedVenue();
    const slot = await seedSlot(venueId, 3, 3.1);
    await expect(venueSlotService.remove(ownerId, slot.id)).resolves.toBe(true);
    expect(await VenueSlotModel.findById(slot.id)).toBeNull();
  });

  it('reports a missing slot as NOT_FOUND', async () => {
    await expect(venueSlotService.remove(ownerId, new Types.ObjectId().toString())).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });
});

describe('bulk edits', () => {
  it('deletes only the slots on the chosen weekdays', async () => {
    const venueId = await seedVenue();
    const first = await seedSlot(venueId, 3, 3.1);
    const second = await seedSlot(venueId, 4, 4.1);
    const res = await venueSlotService.bulkDelete(ownerId, {
      venue_id: venueId,
      weekdays: [new Date(first.start_at).getDay()],
    });
    expect(res).toEqual({ matched: 1, affected: 1, skipped: 0 });
    expect(await VenueSlotModel.findById(first.id)).toBeNull();
    expect(await VenueSlotModel.findById(second.id)).not.toBeNull();
  });

  it('returns zeroes when nothing matches', async () => {
    const venueId = await seedVenue();
    expect(await venueSlotService.bulkDelete(ownerId, { venue_id: venueId })).toEqual({ matched: 0, affected: 0, skipped: 0 });
    expect(await venueSlotService.bulkUpdate(ownerId, { venue_id: venueId, set_price: 5 })).toEqual({
      matched: 0,
      affected: 0,
      skipped: 0,
    });
  });

  it('shifts, resizes, re-prices and blocks a slot in one pass', async () => {
    const venueId = await seedVenue();
    const slot = await seedSlot(venueId, 3, 3.1, { price: 100 });
    const res = await venueSlotService.bulkUpdate(ownerId, {
      venue_id: venueId,
      shift_minutes: 30,
      set_duration_minutes: 90,
      set_price: 450,
      block: true,
    });
    expect(res).toEqual({ matched: 1, affected: 1, skipped: 0 });
    const stored = await VenueSlotModel.findById(slot.id);
    const start = new Date(inDays(3)).getTime() + 30 * MIN_MS;
    expect(stored?.start_at.getTime()).toBe(start);
    expect(stored?.end_at.getTime()).toBe(start + 90 * MIN_MS);
    expect(stored?.price).toBe(450);
    expect(stored?.status).toBe('BLOCKED');
  });

  it('skips a slot the shift would push into the past, leaving it untouched', async () => {
    const venueId = await seedVenue();
    const slot = await seedSlot(venueId, 3, 3.1);
    const res = await venueSlotService.bulkUpdate(ownerId, { venue_id: venueId, shift_minutes: -10 * 24 * 60 });
    expect(res).toEqual({ matched: 1, affected: 0, skipped: 1 });
    expect((await VenueSlotModel.findById(slot.id))?.start_at.toISOString()).toBe(inDays(3));
  });
});

describe('admin slot management (any venue)', () => {
  it('creates slots owned by the venue owner, not the editor', async () => {
    const venueId = await seedVenue();
    const created = await venueSlotService.adminCreate({
      venue_id: venueId,
      slots: [{ start_at: inDays(3), end_at: inDays(3.1) }],
    });
    expect(created).toHaveLength(1);
    expect(created[0].venue_name).toBe('Hall');
    const stored = await VenueSlotModel.findById(created[0].id);
    expect(String(stored?.owner_user_id)).toBe(ownerId);
  });

  it('reports a missing venue on create and list', async () => {
    const missing = new Types.ObjectId().toString();
    await expect(
      venueSlotService.adminCreate({ venue_id: missing, slots: [{ start_at: inDays(3), end_at: inDays(3.1) }] })
    ).rejects.toMatchObject({ message: 'Venue not found', extensions: { code: 'NOT_FOUND' } });
    await expect(venueSlotService.adminListForVenue(missing)).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('lists, edits and removes any venue’s slots', async () => {
    const venueId = await seedVenue();
    const slot = await seedSlot(venueId, 3, 3.1);
    const listed = await venueSlotService.adminListForVenue(venueId);
    expect(listed.map((s) => s.id)).toEqual([slot.id]);

    const edited = await venueSlotService.adminUpdate(slot.id, { notes: 'Set up by onboarding', price: 250 });
    expect(edited).toMatchObject({ notes: 'Set up by onboarding', price: 250 });

    await expect(venueSlotService.adminRemove(slot.id)).resolves.toBe(true);
    expect(await VenueSlotModel.findById(slot.id)).toBeNull();
  });
});

describe('booking request guards', () => {
  async function seedPod() {
    return PodModel.create({
      pod_id: `pod-${new Types.ObjectId().toString()}`,
      pod_title: 'Poetry evening',
      pod_hosts_id: [new Types.ObjectId()],
      club_id: new Types.ObjectId(),
      pod_description: 'An evening of poetry',
      pod_date_time: new Date(inDays(3)),
      pod_type: 'PAID',
      is_active: false,
      venue_approval_status: 'PENDING',
    });
  }

  it('refuses to approve or decline a slot with no pending request', async () => {
    const venueId = await seedVenue();
    const slot = await seedSlot(venueId, 3, 3.1);
    const expected = { message: 'This slot has no pending booking request', extensions: { code: 'BAD_REQUEST' } };
    await expect(venueSlotService.approveRequest(ownerId, slot.id)).rejects.toMatchObject(expected);
    await expect(venueSlotService.declineRequest(ownerId, slot.id)).rejects.toMatchObject(expected);
    expect((await VenueSlotModel.findById(slot.id))?.status).toBe('AVAILABLE');
  });

  it('filters requests by venue and rejects a malformed venue id', async () => {
    const venueA = await seedVenue();
    const venueB = await seedVenue();
    const slot = await seedSlot(venueA, 3, 3.1);
    const pod = await seedPod();
    await venueSlotService.holdForPod(slot.id, venueA, String(pod._id));

    const forA = await venueSlotService.listRequests(ownerId, venueA);
    expect(forA.map((r) => r.slot_id)).toEqual([slot.id]);
    expect(await venueSlotService.listRequests(ownerId, venueB)).toEqual([]);
    await expect(venueSlotService.listRequests(ownerId, 'bad')).rejects.toMatchObject({
      message: 'Invalid venue_id',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});

describe('Auto Pod slot holds', () => {
  const autoPodId = new Types.ObjectId().toString();

  it('books an available slot for the Auto Pod only once, and only for its owner', async () => {
    const venueId = await seedVenue();
    const slot = await seedSlot(venueId, 3, 3.1);

    await expect(
      venueSlotService.bookForAutoPod(slot.id, venueId, new Types.ObjectId().toString(), autoPodId)
    ).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });

    const booked = await venueSlotService.bookForAutoPod(slot.id, venueId, ownerId, autoPodId);
    expect(booked.status).toBe('BOOKED');
    expect(String(booked.booked_by_auto_pod_id)).toBe(autoPodId);

    await expect(venueSlotService.bookForAutoPod(slot.id, venueId, ownerId, autoPodId)).rejects.toMatchObject({
      message: 'This slot is no longer available. Pick another slot.',
      extensions: { code: 'CONFLICT' },
    });
    await expect(venueSlotService.bookForAutoPod('bad', venueId, ownerId, autoPodId)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('transfers the hold to the pod it became, stamping the approval', async () => {
    const venueId = await seedVenue();
    const slot = await seedSlot(venueId, 3, 3.1);
    await venueSlotService.bookForAutoPod(slot.id, venueId, ownerId, autoPodId);
    const podId = new Types.ObjectId().toString();

    await venueSlotService.transferAutoPodHold(slot.id, autoPodId, podId);
    const stored = await VenueSlotModel.findById(slot.id);
    expect(stored?.status).toBe('BOOKED');
    expect(String(stored?.booked_by_pod_id)).toBe(podId);
    expect(stored?.booked_by_auto_pod_id).toBeNull();
    expect(stored?.decision).toBe('APPROVED');
    expect(String(stored?.decided_pod_id)).toBe(podId);
    expect(stored?.decided_at).toBeInstanceOf(Date);

    // The Auto Pod no longer holds it, so a second transfer is a conflict.
    await expect(venueSlotService.transferAutoPodHold(slot.id, autoPodId, podId)).rejects.toMatchObject({
      message: 'This slot is no longer held by that Auto Pod.',
      extensions: { code: 'CONFLICT' },
    });
  });

  it('releases one slot only for the Auto Pod that holds it', async () => {
    const venueId = await seedVenue();
    const slot = await seedSlot(venueId, 3, 3.1);
    await venueSlotService.bookForAutoPod(slot.id, venueId, ownerId, autoPodId);

    await venueSlotService.releaseAutoPodSlot(slot.id, new Types.ObjectId().toString());
    expect((await VenueSlotModel.findById(slot.id))?.status).toBe('BOOKED');

    await venueSlotService.releaseAutoPodSlot(slot.id, autoPodId);
    const freed = await VenueSlotModel.findById(slot.id);
    expect(freed?.status).toBe('AVAILABLE');
    expect(freed?.booked_by_auto_pod_id).toBeNull();
  });

  it('releases every slot an Auto Pod holds and leaves others alone', async () => {
    const venueId = await seedVenue();
    const held = await seedSlot(venueId, 3, 3.1);
    const other = await seedSlot(venueId, 4, 4.1);
    const otherAutoPod = new Types.ObjectId().toString();
    await venueSlotService.bookForAutoPod(held.id, venueId, ownerId, autoPodId);
    await venueSlotService.bookForAutoPod(other.id, venueId, ownerId, otherAutoPod);

    await venueSlotService.releaseForAutoPod(autoPodId);
    expect((await VenueSlotModel.findById(held.id))?.status).toBe('AVAILABLE');
    const untouched = await VenueSlotModel.findById(other.id);
    expect(untouched?.status).toBe('BOOKED');
    expect(String(untouched?.booked_by_auto_pod_id)).toBe(otherAutoPod);
  });
});
