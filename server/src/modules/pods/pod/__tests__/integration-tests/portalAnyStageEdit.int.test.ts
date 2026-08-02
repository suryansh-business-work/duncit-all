import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { podResolvers } from '../../pod.resolver';
import { PodModel } from '../../pod.model';
import { clubAdminService } from '@modules/clubs/clubAdmin/clubAdmin.service';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import * as emailService from '@services/email/email.service';
import { makeContext } from '@test/harness';

const hostId = new Types.ObjectId().toString();
const ownerId = new Types.ObjectId().toString();
const adminId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

beforeEach(() => {
  jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  jest.spyOn(emailService, 'sendVenueSlotRequestEmail').mockResolvedValue(undefined as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
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

const seedPod = (over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toString()}`,
    pod_title: 'Poetry evening',
    pod_hosts_id: [new Types.ObjectId(hostId)],
    club_id: new Types.ObjectId(),
    location_id: new Types.ObjectId(),
    pod_description: 'An evening of poetry and calm conversations',
    pod_date_time: new Date(inDays(2)),
    pod_type: 'PAID',
    pod_amount: 500,
    no_of_spots: 5,
    pod_images_and_videos: [{ url: 'https://img/pod.jpg', type: 'IMAGE' }],
    is_active: false,
    venue_approval_status: 'DECLINED',
    venue_slot_id: null,
    ...over,
  });

describe('portal edit at any stage — slot re-route', () => {
  it('rescues a venue-rejected pod: new slot re-enters the approval queue', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId);
    const pod = await seedPod();

    const updated = await podService.update(
      String(pod._id),
      { venue_id: venueId, venue_slot_id: slotId },
      { actorUserId: adminId, source: 'ADMIN' },
    );

    expect(updated?.venue_approval_status).toBe('PENDING');
    expect(updated?.is_active).toBe(false);
    expect(updated?.venue_slot_id).toBe(slotId);
    // The venue owner is asked again — the slot is held, not booked.
    expect((await VenueSlotModel.findById(slotId))?.status).toBe('PENDING');
    expect(notificationService.create).toHaveBeenCalled();
    // The re-route is visible in the monitored trail.
    const audit = await PodAuditLogModel.findOne({ pod_id: pod._id, action: 'UPDATE' });
    expect(audit?.source).toBe('ADMIN');
    expect(audit?.changes.map((c) => c.field)).toEqual(
      expect.arrayContaining(['venue_slot_id', 'venue_approval_status']),
    );
  });

  it('releases the previously held slot when re-routing to another one', async () => {
    const venueId = await seedVenue();
    const firstSlot = await seedSlot(venueId);
    const secondSlot = await seedSlot(venueId, { start_at: inDays(5), end_at: inDays(5.1) });
    const pod = await seedPod();

    await podService.update(
      String(pod._id),
      { venue_id: venueId, venue_slot_id: firstSlot },
      { actorUserId: adminId, source: 'ADMIN' },
    );
    await podService.update(
      String(pod._id),
      { venue_id: venueId, venue_slot_id: secondSlot },
      { actorUserId: adminId, source: 'ADMIN' },
    );

    expect((await VenueSlotModel.findById(firstSlot))?.status).toBe('AVAILABLE');
    expect((await VenueSlotModel.findById(secondSlot))?.status).toBe('PENDING');
  });

  it('keeps the pod AND its held slot when the new slot is snatched', async () => {
    const venueId = await seedVenue();
    const heldSlot = await seedSlot(venueId);
    const targetSlot = await seedSlot(venueId, { start_at: inDays(5), end_at: inDays(5.1) });
    const pod = await seedPod();
    // The pod is already holding a slot — the state a re-route actually starts from.
    await podService.update(
      String(pod._id),
      { venue_id: venueId, venue_slot_id: heldSlot },
      { actorUserId: adminId, source: 'ADMIN' },
    );
    const booked = await PodModel.findById(pod._id);

    jest
      .spyOn(venueSlotService, 'holdForPod')
      .mockRejectedValue(new Error('This slot is no longer available. Pick another slot.'));

    await expect(
      podService.update(
        String(pod._id),
        { venue_id: venueId, venue_slot_id: targetSlot },
        { actorUserId: adminId, source: 'ADMIN' },
      ),
    ).rejects.toThrow('no longer available');

    // The pod must still own the seat it had — freeing it here would let a
    // second pod be sold the same slot while this one still claims it.
    const after = await PodModel.findById(pod._id);
    expect(String(after?.venue_slot_id)).toBe(heldSlot);
    expect(after?.venue_approval_status).toBe(booked?.venue_approval_status);
    expect(String(after?.pod_date_time)).toBe(String(booked?.pod_date_time));
    const stillHeld = await VenueSlotModel.findById(heldSlot);
    expect(stillHeld?.status).toBe('PENDING');
    expect(String(stillHeld?.booked_by_pod_id)).toBe(String(pod._id));
  });

  it('takes the pod window from the slot it is re-routed onto', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId, { start_at: inDays(6), end_at: inDays(6.2) });
    const pod = await seedPod();
    const slot = await VenueSlotModel.findById(slotId);

    const updated = await podService.update(
      String(pod._id),
      { venue_id: venueId, venue_slot_id: slotId },
      { actorUserId: adminId, source: 'ADMIN' },
    );

    expect(updated?.pod_date_time).toBe(slot?.start_at.toISOString());
    expect(updated?.pod_end_date_time).toBe(slot?.end_at.toISOString());
    expect(updated?.venue_id).toBe(venueId);
  });

  it('clears the booking when the slot is cleared, releasing the old seat', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId);
    const pod = await seedPod();
    await podService.update(
      String(pod._id),
      { venue_id: venueId, venue_slot_id: slotId },
      { actorUserId: adminId, source: 'ADMIN' },
    );

    const cleared = await podService.update(
      String(pod._id),
      { venue_slot_id: null },
      { actorUserId: adminId, source: 'ADMIN' },
    );

    expect(cleared?.venue_slot_id).toBeNull();
    expect(cleared?.venue_approval_status).toBe('NONE');
    expect((await VenueSlotModel.findById(slotId))?.status).toBe('AVAILABLE');
  });

  it('books instantly (no approval queue) when the host owns the venue', async () => {
    const venueId = await seedVenue({ owner_user_id: hostId });
    const [ownSlot] = await venueSlotService.create(hostId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(4), end_at: inDays(4.1), price: 100 }],
    });
    const pod = await seedPod();

    const updated = await podService.update(
      String(pod._id),
      { venue_id: venueId, venue_slot_id: ownSlot.id },
      { actorUserId: adminId, source: 'ADMIN' },
    );

    expect(updated?.venue_approval_status).toBe('NONE');
    expect(updated?.is_active).toBe(true);
    expect((await VenueSlotModel.findById(ownSlot.id))?.status).toBe('BOOKED');
  });

  it('refuses to claim venue inventory for a cancelled or completed pod', async () => {
    const venueId = await seedVenue();
    const slotId = await seedSlot(venueId);
    const cancelled = await seedPod({ deleted_at: new Date() });
    const completed = await seedPod({ completed_at: new Date(), venue_approval_status: 'NONE' });

    await expect(
      podService.update(
        String(cancelled._id),
        { venue_id: venueId, venue_slot_id: slotId },
        { actorUserId: adminId, source: 'ADMIN', includeDeleted: true },
      ),
    ).rejects.toThrow('Restore this pod');
    await expect(
      podService.update(
        String(completed._id),
        { venue_id: venueId, venue_slot_id: slotId },
        { actorUserId: adminId, source: 'ADMIN' },
      ),
    ).rejects.toThrow('completed pod cannot be moved');
    // The slot was never touched.
    expect((await VenueSlotModel.findById(slotId))?.status).toBe('AVAILABLE');
  });

  it('never revives a cancelled pod through is_active', async () => {
    const pod = await seedPod({ deleted_at: new Date(), venue_approval_status: 'NONE' });
    const updated = await podService.update(
      String(pod._id),
      { pod_title: 'Corrected', is_active: true },
      { actorUserId: adminId, source: 'ADMIN', includeDeleted: true },
    );
    expect(updated?.pod_title).toBe('Corrected');
    expect(updated?.is_active).toBe(false);
    expect(updated?.is_deleted).toBe(true);
  });

  it('keeps an explicit is_active when the re-route needs no approval', async () => {
    const venueId = await seedVenue({ owner_user_id: hostId });
    const [ownSlot] = await venueSlotService.create(hostId, {
      venue_id: venueId,
      slots: [{ start_at: inDays(4), end_at: inDays(4.1), price: 100 }],
    });
    const pod = await seedPod();
    const updated = await podService.update(
      String(pod._id),
      { venue_id: venueId, venue_slot_id: ownSlot.id, is_active: false },
      { actorUserId: adminId, source: 'ADMIN' },
    );
    expect(updated?.is_active).toBe(false);
  });

  it('answers a repeat delete of an already-cancelled pod idempotently', async () => {
    const pod = await seedPod({ venue_approval_status: 'NONE' });
    await podService.remove(String(pod._id), { actorUserId: adminId, source: 'ADMIN' });
    await expect(
      podService.remove(String(pod._id), { actorUserId: adminId, source: 'ADMIN' }),
    ).resolves.toBe(true);
  });

  it('leaves the booking untouched when no slot is supplied', async () => {
    const pod = await seedPod({ venue_approval_status: 'NONE', is_active: true });
    const updated = await podService.update(
      String(pod._id),
      { pod_title: 'Renamed evening' },
      { actorUserId: adminId, source: 'ADMIN' },
    );
    expect(updated?.pod_title).toBe('Renamed evening');
    expect(updated?.venue_approval_status).toBe('NONE');
    expect(updated?.is_active).toBe(true);
  });
});

describe('portal edit at any stage — cancelled pods', () => {
  it('admin edits a cancelled pod that every other caller cannot even read', async () => {
    const pod = await seedPod({ deleted_at: new Date(), venue_approval_status: 'NONE' });
    const id = String(pod._id);

    // The admin resolver opts into soft-deleted pods on the caller's behalf.
    const updated = await podResolvers.Mutation.updatePod(
      null,
      { pod_doc_id: id, input: { pod_title: 'Corrected after cancellation' } },
      makeContext({ id: adminId, roles: ['SUPER_ADMIN'] }),
    );
    expect(updated).toMatchObject({ pod_title: 'Corrected after cancellation', is_deleted: true });

    // Without that opt-in the pod stays invisible, as it is to everyone else.
    await expect(
      podService.update(id, { pod_title: 'Nope' }, { actorUserId: adminId, source: 'SYSTEM' }),
    ).rejects.toThrow('Pod not found');
  });

  it('club admin edits a cancelled pod in their own club', async () => {
    const club = await ClubModel.create({
      club_id: `club-${new Types.ObjectId().toString()}`,
      club_name: 'Poets',
      admin_user_ids: [new Types.ObjectId(adminId)],
    } as never);
    const pod = await seedPod({
      club_id: club._id,
      deleted_at: new Date(),
      venue_approval_status: 'NONE',
    });

    const updated = await clubAdminService.updatePod(
      { id: adminId, roles: [] },
      String(pod._id),
      { pod_title: 'Corrected after cancellation' },
    );
    expect(updated?.pod_title).toBe('Corrected after cancellation');
  });
});

describe('podsTable include_deleted', () => {
  it('lists cancelled pods for reviewers only', async () => {
    await seedPod({ deleted_at: new Date(), venue_approval_status: 'NONE' });
    const admin = makeContext({ roles: ['SUPER_ADMIN'] });
    const viewer = makeContext({ roles: [] });

    const hidden = await podResolvers.Query.podsTable(null, {}, admin);
    expect(hidden.total).toBe(0);

    const shown = await podResolvers.Query.podsTable(null, { include_deleted: true }, admin);
    expect(shown.total).toBe(1);
    expect(shown.rows[0].is_deleted).toBe(true);

    // A non-reviewer cannot opt in.
    const denied = await podResolvers.Query.podsTable(null, { include_deleted: true }, viewer);
    expect(denied.total).toBe(0);
  });
});

describe('clubAdminPodsTable — club-scoped, every stage', () => {
  const actor = { id: adminId, roles: [] as string[] };

  it('returns every stage of the actor\'s clubs and nothing else', async () => {
    const club = await ClubModel.create({
      club_id: `club-${new Types.ObjectId().toString()}`,
      club_name: 'Poets',
      admin_user_ids: [new Types.ObjectId(adminId)],
    } as never);
    const other = await ClubModel.create({
      club_id: `club-${new Types.ObjectId().toString()}`,
      club_name: 'Runners',
      admin_user_ids: [new Types.ObjectId()],
    } as never);
    await seedPod({ club_id: club._id, venue_approval_status: 'PENDING', pod_title: 'Awaiting venue' });
    await seedPod({ club_id: club._id, venue_approval_status: 'NONE', pod_title: 'Live' });
    await seedPod({ club_id: club._id, deleted_at: new Date(), pod_title: 'Cancelled' });
    await seedPod({ club_id: other._id, pod_title: 'Someone else' });

    const page = await clubAdminService.podsTable(actor, null);
    expect(page.rows.map((r: any) => r.pod_title).sort()).toEqual([
      'Awaiting venue',
      'Cancelled',
      'Live',
    ]);
    expect(page.total).toBe(3);

    // Narrowing to an owned club is allowed; a foreign one is refused.
    const scoped = await clubAdminService.podsTable(actor, String(club._id));
    expect(scoped.total).toBe(3);
    await expect(clubAdminService.podsTable(actor, String(other._id))).rejects.toThrow();
  });

  it('returns an empty page when the actor administers no clubs', async () => {
    const page = await clubAdminService.podsTable({ id: new Types.ObjectId().toString(), roles: [] }, null);
    expect(page).toMatchObject({ rows: [], total: 0, page: 1, page_size: 0 });
  });

  it('serves the per-pod AI trail for a pod in the actor\'s club', async () => {
    const club = await ClubModel.create({
      club_id: `club-${new Types.ObjectId().toString()}`,
      club_name: 'Poets',
      admin_user_ids: [new Types.ObjectId(adminId)],
    } as never);
    const pod = await seedPod({ club_id: club._id });
    await podService.update(
      String(pod._id),
      { pod_title: 'Edited by club admin' },
      { actorUserId: adminId, source: 'CLUB_ADMIN' },
    );

    const trail = await clubAdminService.podAuditLogs(actor, String(pod._id));
    expect(trail[0]).toMatchObject({ action: 'UPDATE', source: 'CLUB_ADMIN' });

    const foreign = await seedPod();
    await expect(clubAdminService.podAuditLogs(actor, String(foreign._id))).rejects.toThrow();
  });
});
