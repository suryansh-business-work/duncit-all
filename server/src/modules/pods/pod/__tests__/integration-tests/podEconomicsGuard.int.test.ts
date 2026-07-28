import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { FinanceSettingsModel } from '@modules/finance/finance/finance.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import * as emailService from '@services/email/email.service';

const hostId = new Types.ObjectId().toString();
const ownerId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

const IMG = { url: 'https://cdn.example.com/pod.jpg', type: 'IMAGE' };

beforeEach(() => {
  jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  jest.spyOn(emailService, 'sendVenueSlotRequestEmail').mockResolvedValue(undefined as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const makeVirtualInput = (over: Record<string, unknown> = {}) => ({
  pod_title: `Guarded pod ${Math.random().toString(36).slice(2)}`,
  club_id: String(new Types.ObjectId()),
  pod_hosts_id: [hostId],
  pod_mode: 'VIRTUAL',
  meeting_url: 'https://meet.example.com/x',
  pod_description: 'desc',
  pod_type: 'NON_NATIVE_PAID',
  pod_amount: 1000,
  no_of_spots: 2,
  pod_date_time: inDays(1),
  pod_images_and_videos: [IMG],
  ...over,
});

async function seedVenue() {
  const venue = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Guard Hall',
    owner_email: 'owner@x.com',
  });
  return String(venue._id);
}

async function seedSlot(venueId: string, price: number) {
  const [slot] = await venueSlotService.create(ownerId, {
    venue_id: venueId,
    slots: [{ start_at: inDays(3), end_at: inDays(3.1), price }],
  });
  return slot.id;
}

const makeSlotInput = (venueId: string, slotId: string, over: Record<string, unknown> = {}) =>
  makeVirtualInput({
    pod_mode: 'PHYSICAL',
    meeting_url: undefined,
    venue_id: venueId,
    venue_slot_id: slotId,
    ...over,
  });

async function seedDeclinedPod(over: Record<string, unknown> = {}) {
  return PodModel.create({
    pod_id: `guard-${new Types.ObjectId().toString()}`,
    pod_title: 'Poetry evening',
    pod_hosts_id: [new Types.ObjectId(hostId)],
    club_id: new Types.ObjectId(),
    location_id: new Types.ObjectId(),
    pod_description: 'An evening of poetry and calm conversations',
    pod_date_time: new Date(inDays(2)),
    pod_type: 'NON_NATIVE_PAID',
    pod_amount: 1000,
    no_of_spots: 5,
    pod_images_and_videos: [IMG],
    is_active: false,
    venue_approval_status: 'DECLINED',
    venue_slot_id: null,
    ...over,
  });
}

describe('createPod economics guard', () => {
  it('creates a healthy paid pod (positive host earnings, no venue)', async () => {
    const pod = await podService.create(makeVirtualInput());
    expect(pod!.pod_amount).toBe(1000);
  });

  it('still creates free pods untouched by the guard', async () => {
    const pod = await podService.create(
      makeVirtualInput({ pod_type: 'NATIVE_FREE', pod_amount: 0 })
    );
    expect(pod!.pod_amount).toBe(0);
  });

  it('rejects a paid pod whose projected host earnings are ₹0', async () => {
    await FinanceSettingsModel.updateOne(
      { singleton_key: 'finance' },
      { $set: { default_host_commission_pct: 100 } },
      { upsert: true }
    );
    await expect(podService.create(makeVirtualInput())).rejects.toThrow(/earnings/i);
    expect(await PodModel.countDocuments({})).toBe(0);
  });

  it('rejects a paid host-only pod (1 spot → nothing billable → ₹0 earnings)', async () => {
    await expect(podService.create(makeVirtualInput({ no_of_spots: 1 }))).rejects.toThrow(
      /earnings/i
    );
  });

  it('rejects a pod whose total value is below the booked slot price — slot stays free', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId, 5000); // total ₹1,000 < ₹5,000
    await expect(podService.create(makeSlotInput(venueId, slotId))).rejects.toThrow(
      /venue price/i
    );
    expect(await PodModel.countDocuments({})).toBe(0);
    const slot = await VenueSlotModel.findById(slotId);
    expect(slot!.status).toBe('AVAILABLE'); // never held/booked
  });

  it('creates a paid pod with a slot the total covers (guard passes with a venue)', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId, 300);
    const pod = await podService.create(makeSlotInput(venueId, slotId));
    expect(pod!.venue_slot_id).toBe(slotId);
    expect(pod!.venue_approval_status).toBe('PENDING'); // partner slot → held
  });
});

describe('hostResubmitPod economics guard', () => {
  it('rejects resubmitting onto a slot the pod value cannot cover — pod stays rejected/editable', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId, 5000); // total ₹4,000 < ₹5,000
    const pod = await seedDeclinedPod();

    await expect(
      podService.hostResubmit(String(pod._id), hostId, { venue_id: venueId, venue_slot_id: slotId })
    ).rejects.toThrow(/venue price/i);

    const unchanged = await PodModel.findById(pod._id).setOptions({ includeDeleted: true });
    expect(unchanged!.venue_approval_status).toBe('DECLINED');
    expect(unchanged!.venue_slot_id).toBeNull();
    const slot = await VenueSlotModel.findById(slotId);
    expect(slot!.status).toBe('AVAILABLE');
  });

  it('resubmits a paid pod whose value covers the new slot price', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId, 300); // total ₹4,000 ≥ ₹300
    const pod = await seedDeclinedPod();

    const res = await podService.hostResubmit(String(pod._id), hostId, {
      venue_id: venueId,
      venue_slot_id: slotId,
    });
    expect(res!.venue_slot_id).toBe(slotId);
    expect(res!.venue_approval_status).toBe('PENDING');
  });

  it('applies the guard to merged values when the resubmission changes the price', async () => {
    const pod = await seedDeclinedPod();
    // Dropping the pod to a single spot makes it host-only: ₹0 earnings.
    await expect(
      podService.hostResubmit(String(pod._id), hostId, { no_of_spots: 1 })
    ).rejects.toThrow(/earnings/i);
    // An untouched resubmission of the same healthy pod still goes through.
    const res = await podService.hostResubmit(String(pod._id), hostId, {});
    expect(res!.is_active).toBe(true);
  });
});
