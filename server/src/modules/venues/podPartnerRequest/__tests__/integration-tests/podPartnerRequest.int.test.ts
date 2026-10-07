/**
 * Pod Requests between venues and hosts, both ways: the state machine, who may
 * move it, the monthly caps, the held slot, and the contact rule (nothing
 * shared until the pod exists).
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

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

async function seedUser(first: string, email: string, isHost: boolean) {
  const user = await UserModel.create({
    auth: { email, phone: { number: '9876543210', extension: '91' } },
    profile: { first_name: first, last_name: 'Test' },
  });
  if (isHost) await UserRoleModel.create({ user_id: user._id, role: 'HOST' });
  return String(user._id);
}

async function seedVenue(ownerId: string, maxPerMonth = 10) {
  const venue = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Flow Sports Life',
    owner_phone: '+911234567890',
    owner_email: 'venue@duncit.com',
    settings: { rules: { max_host_requests_per_month: maxPerMonth } },
  });
  return String(venue._id);
}

async function seedSlot(venueId: string, ownerId: string, days = 3) {
  const slot = await VenueSlotModel.create({
    venue_id: new Types.ObjectId(venueId),
    owner_user_id: new Types.ObjectId(ownerId),
    start_at: inDays(days),
    end_at: inDays(days + 0.1),
    price: 500,
    status: 'AVAILABLE',
  });
  return String(slot._id);
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

    const slotId = await seedSlot(venueId, ownerId);
    const picked = await podPartnerRequestService.requestSlot(hostId, sent.id, slotId);
    expect(picked).toMatchObject({ status: 'SLOT_REQUESTED', contact: null, slot: { id: slotId, price: 500 } });
    const held = await VenueSlotModel.findById(slotId).lean();
    expect(held).toMatchObject({ status: 'BOOKED' });
    expect(String(held?.booked_by_partner_request_id)).toBe(sent.id);

    const confirmed = await podPartnerRequestService.respondSlot(ownerId, sent.id, true);
    expect(confirmed).toMatchObject({ status: 'SLOT_CONFIRMED', contact: null });
    // The venue's view before the pod: still no host phone or email anywhere.
    expect(JSON.stringify(await podPartnerRequestService.get(ownerId, sent.id))).not.toContain('host@duncit.com');

    await expect(assertRequestReadyForPod(hostId, sent.id, slotId)).resolves.toEqual({ requestId: sent.id, slotId });
    await markPartnerRequestPodCreated(sent.id, new Types.ObjectId().toString());

    const venueView = await podPartnerRequestService.get(ownerId, sent.id);
    expect(venueView).toMatchObject({ status: 'POD_CREATED', contact: { email: 'host@duncit.com', phone: '+919876543210' } });
    const hostView = await podPartnerRequestService.get(hostId, sent.id);
    expect(hostView.contact).toMatchObject({ email: 'venue@duncit.com', phone: '+911234567890' });
  });
});

describe('host → venue', () => {
  it('has the venue pick the slot and the host confirm it', async () => {
    const sent = await podPartnerRequestService.send(hostId, { direction: 'HOST_TO_VENUE', venue_id: venueId });
    expect(createNotification).toHaveBeenLastCalledWith(expect.objectContaining({ target_user_ids: [ownerId] }));
    await podPartnerRequestService.respond(ownerId, sent.id, true);
    const slotId = await seedSlot(venueId, ownerId);
    expect(await codeOf(podPartnerRequestService.requestSlot(hostId, sent.id, slotId))).toBe('FORBIDDEN');
    await podPartnerRequestService.requestSlot(ownerId, sent.id, slotId);
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
  it("enforces the venue's own rule and lets an admin override win", async () => {
    await VenueModel.updateOne({ _id: venueId }, { $set: { 'settings.rules.max_host_requests_per_month': 1 } });
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

describe('the held slot', () => {
  async function toSlotRequested() {
    const sent = await podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId });
    await podPartnerRequestService.respond(hostId, sent.id, true);
    const slotId = await seedSlot(venueId, ownerId);
    await podPartnerRequestService.requestSlot(hostId, sent.id, slotId);
    return { id: sent.id, slotId };
  }

  it('frees the slot and returns to ACCEPTED when the slot is declined', async () => {
    const { id, slotId } = await toSlotRequested();
    const back = await podPartnerRequestService.respondSlot(ownerId, id, false);
    expect(back).toMatchObject({ status: 'ACCEPTED', slot: null });
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'AVAILABLE', booked_by_partner_request_id: null });
  });

  it('refuses a slot another booking already holds', async () => {
    const sent = await podPartnerRequestService.send(ownerId, { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: hostId });
    await podPartnerRequestService.respond(hostId, sent.id, true);
    const slotId = await seedSlot(venueId, ownerId);
    await VenueSlotModel.updateOne({ _id: slotId }, { $set: { status: 'BOOKED' } });
    expect(await codeOf(podPartnerRequestService.requestSlot(hostId, sent.id, slotId))).toBe('CONFLICT');
  });

  it('only lets the host create a pod once the slot is confirmed, on that slot', async () => {
    const { id, slotId } = await toSlotRequested();
    expect(await codeOf(assertRequestReadyForPod(hostId, id, slotId))).toBe('CONFLICT');
    await podPartnerRequestService.respondSlot(ownerId, id, true);
    expect(await codeOf(assertRequestReadyForPod(ownerId, id, slotId))).toBe('NOT_FOUND');
    expect(await codeOf(assertRequestReadyForPod(hostId, id, new Types.ObjectId().toString()))).toBe('BAD_USER_INPUT');
  });

  it('expires a request whose held slot started with no pod, and frees the slot', async () => {
    const { id, slotId } = await toSlotRequested();
    await PodPartnerRequestModel.updateOne({ _id: id }, { $set: { slot_start_at: inDays(-0.01) } });
    expect(await runPartnerRequestExpirySweep()).toBe(1);
    expect(await PodPartnerRequestModel.findById(id).lean()).toMatchObject({ status: 'EXPIRED', is_open: false });
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'AVAILABLE' });
    // Safe to run again: nothing left to expire.
    expect(await runPartnerRequestExpirySweep()).toBe(0);
  });
});
