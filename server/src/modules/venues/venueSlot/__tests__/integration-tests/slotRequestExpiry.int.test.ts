/**
 * A booking request the venue never answered before the slot began.
 *
 * Reported from Partners > Venue Owner > Slot Requests: requests for dates that
 * had long since passed still sat in the queue saying "Awaiting decision". The
 * pod behind each one was stuck offline with `venue_approval_status: PENDING`,
 * its host never told, and the slot stayed held against a pod that could not
 * possibly run.
 *
 * The deadline is the slot's own start time, and passing it IS the decision.
 */
import { Types } from 'mongoose';

// The decision fan-out is part of what this file asserts on, so it is captured
// rather than left to hit the WhatsApp/email lookups behind it.
const notifyEach = jest.fn().mockResolvedValue([]);
jest.mock('@services/notify/notify.service', () => ({
  notifyEach: (...args: unknown[]) => notifyEach(...args),
}));

import { venueSlotService } from '../../venueSlot.service';
import { VenueSlotModel } from '../../venueSlot.model';
import {
  SLOT_REQUEST_EXPIRED_REASON,
  runSlotRequestExpirySweep,
} from '../../venueSlot.expiry';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';

const ownerId = new Types.ObjectId().toString();
const hostId = new Types.ObjectId().toString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

/** Real accounts for both sides — the decision fan-out reads their contact
 * details, and with no documents behind the ids it sends nobody anything. */
async function seedAccounts() {
  await UserModel.create({
    _id: new Types.ObjectId(ownerId),
    auth: { email: 'owner@duncit.com' },
    profile: { first_name: 'Rohit', last_name: 'Nair' },
  });
  await UserModel.create({
    _id: new Types.ObjectId(hostId),
    auth: { email: 'host@duncit.com' },
    profile: { first_name: 'Meera', last_name: 'Nair' },
  });
}

async function seedVenue() {
  const v = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Flow Sports Life',
  });
  return String(v._id);
}

async function seedPod() {
  return PodModel.create({
    pod_id: `pod-${new Types.ObjectId().toString()}`,
    pod_title: 'Community Meetup #4',
    pod_hosts_id: [new Types.ObjectId(hostId)],
    club_id: new Types.ObjectId(),
    pod_description: 'A community meetup',
    pod_date_time: inDays(2),
    pod_type: 'PAID',
    is_active: false,
    venue_approval_status: 'PENDING',
  });
}

/**
 * A request held against a slot that starts `days` from now. Written straight
 * to the collection because `create` refuses a slot in the past — which is the
 * whole point: these rows are old requests that were valid when they were made.
 */
async function seedRequest(days: number) {
  const venueId = await seedVenue();
  const pod = await seedPod();
  const slot = await VenueSlotModel.create({
    venue_id: new Types.ObjectId(venueId),
    owner_user_id: new Types.ObjectId(ownerId),
    start_at: inDays(days),
    end_at: inDays(days + 0.05),
    price: 599,
    status: 'PENDING',
    booked_by_pod_id: pod._id,
  });
  return { venueId, slotId: String(slot._id), podId: String(pod._id) };
}

describe('a slot request nobody answered in time', () => {
  it('declines it, naming the deadline rather than pretending the venue looked', async () => {
    const { slotId, podId } = await seedRequest(-3);

    expect(await runSlotRequestExpirySweep()).toBe(1);

    const slot = await VenueSlotModel.findById(slotId);
    expect(slot?.decision).toBe('DECLINED');
    expect(slot?.decline_reason).toBe(SLOT_REQUEST_EXPIRED_REASON);
    // The slot is usable again, and still says which pod it was about — the
    // decision page has nothing to render without `decided_pod_id`.
    expect(slot?.status).toBe('AVAILABLE');
    expect(slot?.booked_by_pod_id).toBeNull();
    expect(String(slot?.decided_pod_id)).toBe(podId);
  });

  it('takes the pod out of PENDING so the host is not left waiting on it', async () => {
    const { podId } = await seedRequest(-1);

    await runSlotRequestExpirySweep();

    const pod = await PodModel.findById(podId);
    expect(pod?.venue_approval_status).toBe('DECLINED');
    expect(pod?.is_active).toBe(false);
    expect(pod?.venue_slot_id ?? null).toBeNull();
  });

  it('records it against the SYSTEM, not against the venue owner', async () => {
    // The owner did not decline this pod — they never saw it. An audit row
    // blaming them would be a lie told to whoever reads Pod Monitoring later.
    const { podId } = await seedRequest(-2);

    await runSlotRequestExpirySweep();

    const row = await PodAuditLogModel.findOne({ pod_id: new Types.ObjectId(podId) });
    expect(row?.action).toBe('VENUE_DECLINED');
    expect(row?.source).toBe('SYSTEM');
    expect(row?.actor_user_id ?? null).toBeNull();
    expect(row?.note).toBe(SLOT_REQUEST_EXPIRED_REASON);
  });

  it('leaves a request the venue can still answer alone', async () => {
    const { slotId } = await seedRequest(3);

    expect(await runSlotRequestExpirySweep()).toBe(0);

    expect((await VenueSlotModel.findById(slotId))?.status).toBe('PENDING');
  });

  it('declines each request once, however often the sweep runs', async () => {
    await seedRequest(-4);

    expect(await runSlotRequestExpirySweep()).toBe(1);
    expect(await runSlotRequestExpirySweep()).toBe(0);
  });

  it('ignores a slot that has no pod on it at all', async () => {
    // A PENDING slot with no booking is not a request; nothing to decline.
    const venueId = await seedVenue();
    await VenueSlotModel.create({
      venue_id: new Types.ObjectId(venueId),
      owner_user_id: new Types.ObjectId(ownerId),
      start_at: inDays(-2),
      end_at: inDays(-1.95),
      status: 'PENDING',
      booked_by_pod_id: null,
    });

    expect(await runSlotRequestExpirySweep()).toBe(0);
  });

  it('carries on through a request it cannot decline', async () => {
    // One bad row must not strand every request behind it — the pod for this
    // one is gone, which is exactly the shape of a half-deleted record.
    const { podId } = await seedRequest(-5);
    await PodModel.deleteOne({ _id: new Types.ObjectId(podId) });
    await seedRequest(-4);

    expect(await runSlotRequestExpirySweep()).toBe(2);
  });
});

describe('what the venue owner can still see and do', () => {
  it('drops a passed request off the Slot Requests page immediately', async () => {
    // Not "once the sweep next runs" — a row labelled Awaiting decision invites
    // a decision that can no longer be made.
    await seedRequest(-1);
    await seedRequest(4);

    const requests = await venueSlotService.listRequests(ownerId);

    expect(requests).toHaveLength(1);
    expect(new Date(requests[0].start_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('refuses to approve a slot that has already started', async () => {
    // The window between the slot starting and the sweep running is real, and
    // an owner sitting on an old page must not be able to put a pod live for a
    // time that has been and gone.
    const { slotId } = await seedRequest(-1);

    await expect(venueSlotService.approveRequest(ownerId, slotId)).rejects.toThrow(
      /already started/i,
    );

    expect((await VenueSlotModel.findById(slotId))?.status).toBe('PENDING');
  });

  it('still approves one that has not', async () => {
    const { slotId, podId } = await seedRequest(2);

    const approved = await venueSlotService.approveRequest(ownerId, slotId);

    expect(approved.status).toBe('BOOKED');
    expect((await PodModel.findById(podId))?.is_active).toBe(true);
  });

  it('reads the outcome back on the decision page the request email links to', async () => {
    const { slotId } = await seedRequest(-2);
    await runSlotRequestExpirySweep();

    const detail = await venueSlotService.decisionDetail(ownerId, slotId);

    expect(detail.decision).toBe('DECLINED');
    expect(detail.decline_reason).toBe(SLOT_REQUEST_EXPIRED_REASON);
  });
});

describe('who gets told', () => {
  beforeEach(seedAccounts);

  const eventsSent = () =>
    notifyEach.mock.calls.flatMap(([sends]) => (sends ?? []).map((n: any) => n.event));

  it('tells the host their pod is off, because that is not optional news', async () => {
    await seedRequest(-1);

    await runSlotRequestExpirySweep();

    expect(eventsSent()).toContain('HOST_SLOT_REJECTED');
  });

  it('does NOT tell the venue owner they declined it, because they did not', async () => {
    // Their copy is subjected "You declined a slot". Sending that to somebody
    // who never opened the page is a false account of their own actions, and
    // silence is the honest option until a template says what really happened.
    await seedRequest(-1);

    await runSlotRequestExpirySweep();

    expect(eventsSent()).not.toContain('VENUE_SLOT_REJECTED');
  });

  it('still sends the owner their copy when they DID decline it', async () => {
    const { slotId } = await seedRequest(3);

    await venueSlotService.declineRequest(ownerId, slotId, 'Double booked');

    expect(eventsSent()).toContain('VENUE_SLOT_REJECTED');
  });
});

describe('expireRequest on its own', () => {
  it('refuses a slot that is not a live request', async () => {
    const { slotId } = await seedRequest(-1);
    const slot = (await VenueSlotModel.findById(slotId))!;
    slot.status = 'BOOKED';

    expect(await venueSlotService.expireRequest(slot, SLOT_REQUEST_EXPIRED_REASON)).toBe(false);
  });
});
