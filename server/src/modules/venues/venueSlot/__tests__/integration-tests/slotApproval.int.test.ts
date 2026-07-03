import { Types } from 'mongoose';
import { venueSlotService } from '../../venueSlot.service';
import { VenueSlotModel } from '../../venueSlot.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { venueLocalYmd } from '@modules/venues/autoExtend/slotGenerator';

const ownerId = new Types.ObjectId().toString();
const hostId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

async function seedVenue(over: Record<string, unknown> = {}) {
  const v = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Hall',
    ...over,
  });
  return String(v._id);
}

async function seedPod(over: Record<string, unknown> = {}) {
  return PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toString()}`,
    pod_title: 'Poetry evening',
    pod_hosts_id: [new Types.ObjectId(hostId)],
    club_id: new Types.ObjectId(),
    pod_description: 'An evening of poetry',
    pod_date_time: new Date(inDays(2)),
    pod_type: 'NATIVE_PAID',
    is_active: false,
    venue_approval_status: 'PENDING',
    ...over,
  });
}

describe('venue leave/holiday blocking', () => {
  it('rejects creating a slot on a leave date', async () => {
    const leaveDay = venueLocalYmd(new Date(inDays(2)));
    const venueId = await seedVenue({ settings: { holidays: [leaveDay] } });
    await expect(
      venueSlotService.create(ownerId, {
        venue_id: venueId,
        slots: [{ start_at: inDays(2), end_at: inDays(2.05) }],
      })
    ).rejects.toThrow(/leave\/holiday/i);
  });

  it('hides pre-existing slots on a leave date from venueAvailableSlots', async () => {
    const venueId = await seedVenue();
    await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(2), end_at: inDays(2.05) }],
    });
    // Owner marks the date as leave AFTER the slot exists.
    const leaveDay = venueLocalYmd(new Date(inDays(2)));
    await VenueModel.updateOne({ _id: venueId }, { $set: { 'settings.holidays': [leaveDay] } });
    expect(await venueSlotService.listAvailable(venueId)).toHaveLength(0);
  });
});

describe('slot booking requests (hold → approve/decline)', () => {
  async function seedHold() {
    const venueId = await seedVenue();
    const [slot] = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(3), end_at: inDays(3.1), price: 400 }],
    });
    const pod = await seedPod();
    await venueSlotService.holdForPod(slot.id, venueId, String(pod._id));
    return { venueId, slotId: slot.id, podId: String(pod._id) };
  }

  it('holds an AVAILABLE slot as PENDING and lists it as a request', async () => {
    const { slotId, podId } = await seedHold();
    const held = await VenueSlotModel.findById(slotId);
    expect(held?.status).toBe('PENDING');
    expect(String(held?.booked_by_pod_id)).toBe(podId);

    const requests = await venueSlotService.listRequests(ownerId);
    expect(requests).toHaveLength(1);
    expect(requests[0].pod_title).toBe('Poetry evening');
    expect(requests[0].price).toBe(400);
  });

  it('cannot hold a slot that is not AVAILABLE', async () => {
    const { slotId, venueId } = await seedHold();
    await expect(
      venueSlotService.holdForPod(slotId, venueId, String(new Types.ObjectId()))
    ).rejects.toThrow(/no longer available/i);
  });

  it('approve books the slot and puts the pod live', async () => {
    const { slotId, podId } = await seedHold();
    const approved = await venueSlotService.approveRequest(ownerId, slotId);
    expect(approved.status).toBe('BOOKED');

    const pod = await PodModel.findById(podId);
    expect(pod?.venue_approval_status).toBe('APPROVED');
    expect(pod?.is_active).toBe(true);
  });

  it('decline frees the slot and keeps the pod offline', async () => {
    const { slotId, podId } = await seedHold();
    const declined = await venueSlotService.declineRequest(ownerId, slotId, 'Double booked');
    expect(declined.status).toBe('AVAILABLE');
    expect(declined.booked_by_pod_id).toBeNull();

    const pod = await PodModel.findById(podId);
    expect(pod?.venue_approval_status).toBe('DECLINED');
    expect(pod?.is_active).toBe(false);
    expect(pod?.venue_slot_id ?? null).toBeNull();
  });

  it('only the venue owner can decide a request', async () => {
    const { slotId } = await seedHold();
    const stranger = new Types.ObjectId().toString();
    await expect(venueSlotService.approveRequest(stranger, slotId)).rejects.toThrow(/not your slot/i);
    await expect(venueSlotService.declineRequest(stranger, slotId)).rejects.toThrow(/not your slot/i);
  });

  it('pending slots are protected from edit, delete and bulk ops', async () => {
    const { slotId, venueId } = await seedHold();
    await expect(venueSlotService.update(ownerId, slotId, { price: 999 })).rejects.toThrow(/pending booking/i);
    await expect(venueSlotService.remove(ownerId, slotId)).rejects.toThrow(/pending booking/i);

    const bulk = await venueSlotService.bulkDelete(ownerId, { venue_id: venueId });
    expect(bulk.matched).toBe(0);
    expect((await VenueSlotModel.findById(slotId))?.status).toBe('PENDING');
  });
});

describe('venue leave dates block booking via listAvailable + window validation', () => {
  it('rejects rescheduling a slot onto a leave date', async () => {
    const leaveDay = venueLocalYmd(new Date(inDays(5)));
    const venueId = await seedVenue({ settings: { holidays: [leaveDay] } });
    const [slot] = await venueSlotService.create(ownerId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(4), end_at: inDays(4.05) }],
    });
    await expect(
      venueSlotService.update(ownerId, slot.id, { start_at: inDays(5), end_at: inDays(5.05) })
    ).rejects.toThrow(/leave\/holiday/i);
  });
});
