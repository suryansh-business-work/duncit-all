/**
 * Pod Requests between venues and hosts, both ways: the state machine, who may
 * move it, the monthly caps, the proposed window held for the request (priced
 * with the venue's charges, frozen as the booking's price once confirmed), and
 * the contact rule (nothing shared until the pod exists).
 */
import { Types } from 'mongoose';

// Every transition tells the other side; captured so the suite asserts on it
// instead of writing real inbox rows and pushes.
const createNotification = jest.fn().mockResolvedValue({});
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: (...args: unknown[]) => createNotification(...args) },
}));

import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { podPartnerRequestService } from '../../podPartnerRequest.service';
import { PodPartnerRequestModel } from '../../podPartnerRequest.model';
import {
  assertRequestReadyForPod,
  markPartnerRequestPodCreated,
  runPartnerRequestExpirySweep,
} from '../../podPartnerRequest.lifecycle';
import { proposal, windowOn } from './proposal.fixture';

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);
// Phone numbers are unique per user, so every seeded account gets its own.
let phoneSeq = 0;

async function seedUser(first: string, email: string, isHost: boolean) {
  phoneSeq += 1;
  const user = await UserModel.create({
    auth: { email, phone: { number: String(9876543200 + phoneSeq), extension: '91' } },
    profile: { first_name: first, last_name: 'Test' },
  });
  if (isHost) await UserRoleModel.create({ user_id: user._id, role: 'HOST' });
  return String(user._id);
}

async function seedVenue(ownerId: string) {
  const venue = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Flow Sports Life',
    owner_phone: '+911234567890',
    owner_email: 'venue@duncit.com',
    capacity: 40,
  });
  return String(venue._id);
}

const codeOf = async (run: Promise<unknown>) => {
  try {
    await run;
    return 'OK';
  } catch (err) {
    return (err as { extensions?: { code?: string } }).extensions?.code ?? 'THROWN';
  }
};

let ownerId: string;
let hostId: string;
let venueId: string;

beforeEach(async () => {
  createNotification.mockClear();
  ownerId = await seedUser('Rohit', 'owner@duncit.com', false);
  hostId = await seedUser('Meera', 'host@duncit.com', true);
  venueId = await seedVenue(ownerId);
});

describe('venue → host, end to end', () => {
  it('moves REQUESTED → ACCEPTED → SLOT_REQUESTED → SLOT_CONFIRMED → POD_CREATED and shares contact only at the end', async () => {
    const sent = await podPartnerRequestService.send(ownerId, {
      direction: 'VENUE_TO_HOST',
      venue_id: venueId,
      host_user_id: hostId,
      note: 'Weekend board games',
    });
    expect(sent).toMatchObject({ status: 'REQUESTED', viewer_side: 'VENUE', contact: null });
    expect(createNotification).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'New Pod Request', target_user_ids: [hostId], link_url: `/pod-requests/${sent.id}` })
    );

    const accepted = await podPartnerRequestService.respond(hostId, sent.id, true);
    expect(accepted).toMatchObject({ status: 'ACCEPTED', contact: null });

    // The receiver (the host) proposes the window, the guests and the price terms.
    const proposed = await podPartnerRequestService.proposeWindow(hostId, sent.id, proposal());
    expect(proposed).toMatchObject({
      status: 'SLOT_REQUESTED',
      contact: null,
      slot: { price: 2000, offer: { model: 'FLAT', rate: 2000, pax: 10, status: 'SENT', awaiting: 'VENUE' } },
    });
    const slotId = String(proposed.slot?.id);
    const held = await VenueSlotModel.findById(slotId).lean();
    expect(held).toMatchObject({ status: 'BOOKED', requested_by_host: true, price_snapshot: null });
    expect(String(held?.booked_by_partner_request_id)).toBe(sent.id);

    // Confirming freezes the proposed terms as the booking's price.
    const confirmed = await podPartnerRequestService.respondSlot(ownerId, sent.id, true);
    expect(confirmed).toMatchObject({ status: 'SLOT_CONFIRMED', contact: null });
    const agreed = await VenueSlotModel.findById(slotId).lean();
    expect(agreed?.offer?.status).toBe('ACCEPTED');
    expect(agreed?.price_snapshot).toMatchObject({ venue_payout: 2000 });
    expect(agreed?.offer?.history.map((h) => [h.by, h.action])).toEqual([
      ['HOST', 'OFFER'],
      ['VENUE', 'ACCEPT'],
    ]);
    // The venue's view before the pod: still no host phone or email anywhere.
    expect(JSON.stringify(await podPartnerRequestService.get(ownerId, sent.id))).not.toContain('host@duncit.com');

    await expect(assertRequestReadyForPod(hostId, sent.id, slotId)).resolves.toEqual({ requestId: sent.id, slotId });
    await markPartnerRequestPodCreated(sent.id, new Types.ObjectId().toString());

    const venueView = await podPartnerRequestService.get(ownerId, sent.id);
    expect(venueView).toMatchObject({
      status: 'POD_CREATED',
      contact: { email: 'host@duncit.com', phone: expect.stringMatching(/^\+91\d{10}$/) },
    });
    const hostView = await podPartnerRequestService.get(hostId, sent.id);
    expect(hostView.contact).toMatchObject({ email: 'venue@duncit.com', phone: '+911234567890' });
  });
});

describe('host → venue', () => {
  it('has the venue propose the window and price, and the host confirm it', async () => {
    const sent = await podPartnerRequestService.send(hostId, { direction: 'HOST_TO_VENUE', venue_id: venueId });
    expect(createNotification).toHaveBeenLastCalledWith(expect.objectContaining({ target_user_ids: [ownerId] }));
    await podPartnerRequestService.respond(ownerId, sent.id, true);
    expect(await codeOf(podPartnerRequestService.proposeWindow(hostId, sent.id, proposal()))).toBe('FORBIDDEN');
    const proposed = await podPartnerRequestService.proposeWindow(ownerId, sent.id, proposal());
    expect(proposed.slot?.offer?.history?.[0]).toMatchObject({ by: 'VENUE', action: 'OFFER' });
    expect(await codeOf(podPartnerRequestService.respondSlot(ownerId, sent.id, true))).toBe('FORBIDDEN');
    const confirmed = await podPartnerRequestService.respondSlot(hostId, sent.id, true);
    expect(confirmed.status).toBe('SLOT_CONFIRMED');
  });
});

describe('who may move a request', () => {
  it('refuses the sender answering, the receiver withdrawing, and strangers reading', async () => {
    const strangerId = await seedUser('Asha', 'stranger@duncit.com', true);
    const sent = await podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId });
    expect(await codeOf(podPartnerRequestService.respond(ownerId, sent.id, true))).toBe('FORBIDDEN');
    expect(await codeOf(podPartnerRequestService.cancel(hostId, sent.id))).toBe('FORBIDDEN');
    expect(await codeOf(podPartnerRequestService.get(strangerId, sent.id))).toBe('FORBIDDEN');
  });

  it('refuses a venue owner sending from a venue that is not theirs', async () => {
    const otherOwner = await seedUser('Kiran', 'other@duncit.com', false);
    expect(
      await codeOf(podPartnerRequestService.send(otherOwner, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId }))
    ).toBe('FORBIDDEN');
  });

  it('lands a stale second answer on CONFLICT instead of moving the request twice', async () => {
    const sent = await podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId });
    await podPartnerRequestService.respond(hostId, sent.id, false);
    expect(await codeOf(podPartnerRequestService.respond(hostId, sent.id, true))).toBe('CONFLICT');
  });
});

describe('one live request per pair', () => {
  it('refuses a second open request between the same venue and host, either direction', async () => {
    await podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId });
    expect(await codeOf(podPartnerRequestService.send(hostId, { direction: 'HOST_TO_VENUE', venue_id: venueId }))).toBe('CONFLICT');
  });

  it('allows a new one once the last was declined', async () => {
    const first = await podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId });
    await podPartnerRequestService.respond(hostId, first.id, false);
    expect(await codeOf(podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId }))).toBe('OK');
  });
});

describe('monthly limits', () => {
  it('enforces the admin-set limit, and an admin raising it lets the venue send again', async () => {
    await VenueModel.updateOne({ _id: venueId }, { $set: { host_requests_limit_override: 1 } });
    const secondHost = await seedUser('Dev', 'dev@duncit.com', true);
    expect(await codeOf(podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId }))).toBe('OK');
    expect(
      await codeOf(podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: secondHost }))
    ).toBe('LIMIT_REACHED');
    expect(await podPartnerRequestService.quota(ownerId, 'VENUE', venueId)).toEqual({ limit: 1, used: 1, remaining: 0 });

    await VenueModel.updateOne({ _id: venueId }, { $set: { host_requests_limit_override: 2 } });
    expect(
      await codeOf(podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: secondHost }))
    ).toBe('OK');
  });

  it('does not spend the allowance on a send that failed', async () => {
    await podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId });
    // Same pair again: refused as a duplicate, and the quota is given back.
    await codeOf(podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId }));
    expect((await podPartnerRequestService.quota(ownerId, 'VENUE', venueId)).used).toBe(1);
  });
});

describe('the proposed window', () => {
  async function toSlotRequested() {
    const sent = await podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId });
    await podPartnerRequestService.respond(hostId, sent.id, true);
    const proposed = await podPartnerRequestService.proposeWindow(hostId, sent.id, proposal());
    return { id: sent.id, slotId: String(proposed.slot?.id) };
  }

  it('deletes the hold and returns to ACCEPTED when the proposal is declined', async () => {
    const { id, slotId } = await toSlotRequested();
    const back = await podPartnerRequestService.respondSlot(ownerId, id, false);
    expect(back).toMatchObject({ status: 'ACCEPTED', slot: null });
    expect(await VenueSlotModel.findById(slotId).lean()).toBeNull();
  });

  it('refuses a window another booking already holds, and one outside opening hours', async () => {
    const sent = await podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId });
    await podPartnerRequestService.respond(hostId, sent.id, true);
    const taken = proposal();
    await VenueSlotModel.create({
      venue_id: new Types.ObjectId(venueId),
      owner_user_id: new Types.ObjectId(ownerId),
      start_at: new Date(taken.start_at),
      end_at: new Date(taken.end_at),
      price: 500,
      status: 'BOOKED',
    });
    expect(await codeOf(podPartnerRequestService.proposeWindow(hostId, sent.id, taken))).toBe('CONFLICT');
    const lateNight = proposal(4, windowOn(4, 23 * 60 + 30, 23 * 60 + 50));
    expect(await codeOf(podPartnerRequestService.proposeWindow(hostId, sent.id, lateNight))).toBe('CONFLICT');
    expect((await PodPartnerRequestModel.findById(sent.id).lean())?.status).toBe('ACCEPTED');
  });

  it('only lets the host create a pod once the proposal is confirmed, on that booking', async () => {
    const { id, slotId } = await toSlotRequested();
    expect(await codeOf(assertRequestReadyForPod(hostId, id, slotId))).toBe('CONFLICT');
    await podPartnerRequestService.respondSlot(ownerId, id, true);
    expect(await codeOf(assertRequestReadyForPod(ownerId, id, slotId))).toBe('NOT_FOUND');
    expect(await codeOf(assertRequestReadyForPod(hostId, id, new Types.ObjectId().toString()))).toBe('BAD_USER_INPUT');
  });

  it('expires a request whose held window started with no pod, and deletes the hold', async () => {
    const { id, slotId } = await toSlotRequested();
    await PodPartnerRequestModel.updateOne({ _id: id }, { $set: { slot_start_at: inDays(-0.01) } });
    expect(await runPartnerRequestExpirySweep()).toBe(1);
    expect(await PodPartnerRequestModel.findById(id).lean()).toMatchObject({ status: 'EXPIRED', is_open: false });
    expect(await VenueSlotModel.findById(slotId).lean()).toBeNull();
    // Safe to run again: nothing left to expire.
    expect(await runPartnerRequestExpirySweep()).toBe(0);
  });
});
