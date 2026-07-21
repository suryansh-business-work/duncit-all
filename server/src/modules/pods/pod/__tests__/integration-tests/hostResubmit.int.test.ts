import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';
import { clubAdminService } from '@modules/pods/clubAdmin/clubAdmin.service';
import { ClubModel } from '@modules/pods/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import * as emailService from '@services/email/email.service';

const hostId = new Types.ObjectId().toString();
const ownerId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

let notifyCreate: jest.SpyInstance;
let slotRequestEmail: jest.SpyInstance;

beforeEach(() => {
  notifyCreate = jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  slotRequestEmail = jest
    .spyOn(emailService, 'sendVenueSlotRequestEmail')
    .mockResolvedValue(undefined as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function seedVenue(over: Record<string, unknown> = {}) {
  const v = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Hall',
    owner_email: 'owner@x.com',
    ...over,
  });
  return String(v._id);
}

async function seedSlot(venueId: string, over: Record<string, unknown> = {}) {
  const [slot] = await venueSlotService.create(ownerId, {
    venue_id: venueId,
    slots: [{ start_at: inDays(3), end_at: inDays(3.1), price: 400, ...over }],
  });
  return slot.id;
}

/** A venue-rejected pod exactly as declineVenueSlotRequest leaves it. */
async function seedDeclinedPod(over: Record<string, unknown> = {}) {
  return PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toString()}`,
    pod_title: 'Poetry evening',
    pod_hosts_id: [new Types.ObjectId(hostId)],
    club_id: new Types.ObjectId(),
    location_id: new Types.ObjectId(),
    pod_description: 'An evening of poetry and calm conversations',
    pod_date_time: new Date(inDays(2)),
    pod_type: 'NATIVE_FREE',
    pod_images_and_videos: [{ url: 'https://img/pod.jpg', type: 'IMAGE' }],
    is_active: false,
    venue_approval_status: 'DECLINED',
    venue_slot_id: null,
    ...over,
  });
}

describe('hostResubmitPod — venue-rejected booking cycle', () => {
  it('rejects non-hosts, non-declined pods and invalid ids', async () => {
    const pod = await seedDeclinedPod();
    await expect(
      podService.hostResubmit(String(pod._id), new Types.ObjectId().toString(), {})
    ).rejects.toThrow(/only the pod host/i);
    await expect(podService.hostResubmit('bad-id', hostId, {})).rejects.toThrow(/invalid pod id/i);

    const live = await seedDeclinedPod({ venue_approval_status: 'NONE', is_active: true });
    await expect(podService.hostResubmit(String(live._id), hostId, {})).rejects.toThrow(
      /venue request was rejected/i
    );
  });

  it('blocks resubmitting content that trips the moderation guard', async () => {
    const pod = await seedDeclinedPod();
    await expect(
      podService.hostResubmit(String(pod._id), hostId, {
        pod_description: 'Contact me on 9876543210 to pay directly',
      })
    ).rejects.toThrow();
  });

  it('resubmits with a new slot at another partner venue — same pod re-enters PENDING', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId);
    const pod = await seedDeclinedPod();

    const res = await podService.hostResubmit(String(pod._id), hostId, {
      pod_title: 'Poetry evening v2',
      venue_id: venueId,
      venue_slot_id: slotId,
      is_active: true, // blocked field — must be ignored
      pod_hosts_id: [new Types.ObjectId().toString()], // blocked field — must be ignored
    });

    // Same pod row, updated details, offline + pending approval again.
    expect(res.id).toBe(String(pod._id));
    expect(res.pod_title).toBe('Poetry evening v2');
    expect(res.venue_approval_status).toBe('PENDING');
    expect(res.is_active).toBe(false);
    expect(res.venue_slot_id).toBe(slotId);

    const refreshed = await PodModel.findById(pod._id);
    expect((refreshed!.pod_hosts_id ?? []).map(String)).toEqual([hostId]);
    // The pod window is locked to the slot.
    const slot = await VenueSlotModel.findById(slotId);
    expect(refreshed!.pod_date_time.getTime()).toBe(slot!.start_at.getTime());
    // The slot is held again and the venue owner is notified (in-app + email).
    expect(slot!.status).toBe('PENDING');
    expect(String(slot!.booked_by_pod_id)).toBe(String(pod._id));
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New slot booking request', target_user_ids: [ownerId] })
    );
    expect(slotRequestEmail).toHaveBeenCalled();
  });

  it('books instantly when the host resubmits onto their own venue slot', async () => {
    const ownVenue = await VenueModel.create({
      owner_user_id: hostId,
      status: 'APPROVED',
      is_active: true,
      venue_name: 'My own hall',
    });
    const [slot] = await venueSlotService.create(hostId, {
      venue_id: String(ownVenue._id),
      slots: [{ start_at: inDays(4), end_at: inDays(4.1) }],
    });
    const pod = await seedDeclinedPod();

    const res = await podService.hostResubmit(String(pod._id), hostId, {
      venue_id: String(ownVenue._id),
      venue_slot_id: slot.id,
    });
    expect(res.venue_approval_status).toBe('NONE');
    expect(res.is_active).toBe(true);
    expect((await VenueSlotModel.findById(slot.id))!.status).toBe('BOOKED');
    expect(slotRequestEmail).not.toHaveBeenCalled();
  });

  it('goes live immediately when resubmitted as a virtual pod', async () => {
    const pod = await seedDeclinedPod({ venue_id: new Types.ObjectId() });
    const res = await podService.hostResubmit(String(pod._id), hostId, {
      pod_mode: 'VIRTUAL',
      meeting_platform: 'Zoom',
      meeting_url: 'https://zoom.us/j/123',
    });
    expect(res.venue_approval_status).toBe('NONE');
    expect(res.is_active).toBe(true);
    expect(res.venue_id).toBeNull();
    expect(res.venue_slot_id).toBeNull();
  });

  it('refuses to keep a partner venue without picking a fresh slot', async () => {
    const venueId = await seedVenue();
    const pod = await seedDeclinedPod({ venue_id: new Types.ObjectId(venueId) });
    await expect(podService.hostResubmit(String(pod._id), hostId, {})).rejects.toThrow(
      /one of your approved venues/i
    );
  });

  it('rejects an unavailable slot and reverts to the rejected state on a snatch race', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId);
    const pod = await seedDeclinedPod();

    // Slot already taken before submission → clean rejection.
    await VenueSlotModel.updateOne({ _id: slotId }, { $set: { status: 'BOOKED' } });
    await expect(
      podService.hostResubmit(String(pod._id), hostId, { venue_id: venueId, venue_slot_id: slotId })
    ).rejects.toThrow(/no longer available/i);

    // Race: AVAILABLE at validation time, snatched before the hold.
    await VenueSlotModel.updateOne({ _id: slotId }, { $set: { status: 'AVAILABLE' } });
    const realHold = venueSlotService.holdForPod.bind(venueSlotService);
    jest.spyOn(venueSlotService, 'holdForPod').mockImplementationOnce(async (...args) => {
      await VenueSlotModel.updateOne({ _id: slotId }, { $set: { status: 'BOOKED' } });
      return realHold(...args);
    });
    await expect(
      podService.hostResubmit(String(pod._id), hostId, { venue_id: venueId, venue_slot_id: slotId })
    ).rejects.toThrow(/no longer available/i);

    // The pod is back in the fully-editable rejected state — never deleted.
    const reverted = await PodModel.findById(pod._id);
    expect(reverted).not.toBeNull();
    expect(reverted!.venue_approval_status).toBe('DECLINED');
    expect(reverted!.is_active).toBe(false);
    expect(reverted!.venue_slot_id).toBeNull();
  });
});

describe('portal editing works at any stage (club admin + admin)', () => {
  const seedClubbedPod = async (over: Record<string, unknown> = {}) => {
    const adminUser = new Types.ObjectId();
    const club = await ClubModel.create({
      club_id: `club-${new Types.ObjectId().toString()}`,
      club_name: 'Chess Club',
      admin_user_ids: [adminUser],
    });
    const pod = await PodModel.create({
      pod_id: `pod-${new Types.ObjectId().toString()}`,
      pod_title: 'Blitz night',
      pod_hosts_id: [new Types.ObjectId(hostId)],
      club_id: club._id,
      location_id: new Types.ObjectId(),
      pod_description: 'Fast games',
      pod_date_time: new Date(inDays(2)),
      pod_type: 'NATIVE_FREE',
      ...over,
    });
    return { pod, adminUserId: String(adminUser) };
  };

  it('admin updatePod edits a venue-DECLINED pod and a completed pod', async () => {
    const declined = await seedDeclinedPod();
    const updated = await podService.update(String(declined._id), { pod_title: 'Edited while rejected' });
    expect(updated.pod_title).toBe('Edited while rejected');
    expect(updated.venue_approval_status).toBe('DECLINED');

    const { pod: completed } = await seedClubbedPod({ completed_at: new Date(), is_active: false });
    const done = await podService.update(String(completed._id), { pod_title: 'Edited after completion' });
    expect(done.pod_title).toBe('Edited after completion');
  });

  it('club admin edits pods of their club at any stage — and only their club', async () => {
    const { pod, adminUserId } = await seedClubbedPod({
      venue_approval_status: 'DECLINED',
      is_active: false,
    });
    const actor = { id: adminUserId, roles: ['CLUB_ADMIN'] } as any;
    const updated = await clubAdminService.updatePod(actor, String(pod._id), {
      pod_title: 'Club admin edit while rejected',
    });
    expect(updated.pod_title).toBe('Club admin edit while rejected');

    // PENDING-approval pods are equally editable by the club admin.
    const { pod: pending, adminUserId: admin2 } = await seedClubbedPod({
      venue_approval_status: 'PENDING',
      is_active: false,
    });
    const actor2 = { id: admin2, roles: ['CLUB_ADMIN'] } as any;
    const edited = await clubAdminService.updatePod(actor2, String(pending._id), {
      pod_title: 'Edited while pending',
    });
    expect(edited.pod_title).toBe('Edited while pending');

    // A stranger club admin is refused.
    await expect(
      clubAdminService.updatePod({ id: String(new Types.ObjectId()), roles: ['CLUB_ADMIN'] } as any, String(pod._id), {
        pod_title: 'Nope',
      })
    ).rejects.toThrow(/do not administer/i);
  });
});
