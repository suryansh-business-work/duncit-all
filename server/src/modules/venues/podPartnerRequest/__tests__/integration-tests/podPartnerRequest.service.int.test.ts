/**
 * Pod Request edges the end-to-end suite does not walk: input validation on
 * send, who may send to whom, withdrawing, picking a slot too early or from
 * another venue, losing the race after the hold, the lists and quotas each
 * side reads, and the pod-created / expiry bookkeeping.
 */
import { Types } from 'mongoose';

const createNotification = jest.fn().mockResolvedValue({});
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: (...args: unknown[]) => createNotification(...args) },
}));

import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { moderationService } from '@modules/moderation/moderation.service';
import { PARTNER_REQUEST_NOTE_MAX, podPartnerRequestService as svc } from '../../podPartnerRequest.service';
import { PodPartnerRequestModel } from '../../podPartnerRequest.model';
import { PartnerRequestQuotaModel } from '../../podPartnerRequest.quota';
import {
  assertRequestReadyForPod,
  markPartnerRequestPodCreated,
  runPartnerRequestExpirySweep,
} from '../../podPartnerRequest.lifecycle';

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);
let phoneSeq = 0;

async function seedUser(first: string, isHost: boolean) {
  phoneSeq += 1;
  const user = await UserModel.create({
    auth: { email: `${first.toLowerCase()}@duncit.com`, phone: { number: String(9876543300 + phoneSeq), extension: '91' } },
    profile: { first_name: first, last_name: 'Test' },
  });
  if (isHost) await UserRoleModel.create({ user_id: user._id, role: 'HOST' });
  return String(user._id);
}

async function seedVenue(owner: string, over: Record<string, unknown> = {}) {
  const venue = await VenueModel.create({ owner_user_id: owner, status: 'APPROVED', is_active: true, venue_name: 'Hall', ...over });
  return String(venue._id);
}

async function seedSlot(venueId: string, owner: string, days = 3) {
  const slot = await VenueSlotModel.create({
    venue_id: new Types.ObjectId(venueId),
    owner_user_id: new Types.ObjectId(owner),
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
const toHost = (over: Record<string, unknown> = {}) => ({
  direction: 'VENUE_TO_HOST' as const,
  venue_id: venueId,
  host_user_id: hostId,
  ...over,
});

beforeAll(async () => {
  await Promise.all([PodPartnerRequestModel.init(), PartnerRequestQuotaModel.init()]);
});

beforeEach(async () => {
  createNotification.mockClear();
  ownerId = await seedUser('Rohit', false);
  hostId = await seedUser('Meera', true);
  venueId = await seedVenue(ownerId);
});

describe('send — validation', () => {
  const noteOf = (length: number) => 'Board games night. '.repeat(40).slice(0, length);

  it('trims the note and refuses one over the limit', async () => {
    const sent = await svc.send(ownerId, toHost({ note: '   Quiz night   ' }));
    expect(sent.note).toBe('Quiz night');
    expect(PARTNER_REQUEST_NOTE_MAX).toBe(500);
    await PodPartnerRequestModel.deleteMany({});
    expect(await codeOf(svc.send(ownerId, toHost({ note: noteOf(501) })))).toBe('BAD_USER_INPUT');
    expect(await codeOf(svc.send(ownerId, toHost({ note: `  ${noteOf(500)}  ` })))).toBe('OK');
  });

  it('moderates a non-empty note and spends nothing when it is rejected', async () => {
    const moderate = jest.spyOn(moderationService, 'assertCleanOrThrow');
    await svc.send(ownerId, toHost());
    expect(moderate).not.toHaveBeenCalled();

    const otherHost = await seedUser('Dev', true);
    const rejection = Object.assign(new Error('violates'), { extensions: { code: 'POD_CONTENT_REJECTED' } });
    moderate.mockImplementationOnce(() => {
      throw rejection;
    });
    expect(await codeOf(svc.send(ownerId, toHost({ host_user_id: otherHost, note: 'bad words' })))).toBe('POD_CONTENT_REJECTED');
    expect(moderate).toHaveBeenLastCalledWith({ pod_title: '', pod_description: 'bad words' });
    expect((await svc.quota(ownerId, 'VENUE', venueId)).used).toBe(1);
    moderate.mockRestore();
  });

  it('refuses a malformed venue id and a venue that is not approved and active', async () => {
    expect(await codeOf(svc.send(ownerId, toHost({ venue_id: 'nope' })))).toBe('BAD_USER_INPUT');
    expect(await codeOf(svc.send(ownerId, toHost({ venue_id: new Types.ObjectId().toString() })))).toBe('NOT_FOUND');
    const draft = await seedVenue(ownerId, { status: 'DRAFT' });
    const paused = await seedVenue(ownerId, { is_active: false });
    expect(await codeOf(svc.send(ownerId, toHost({ venue_id: draft })))).toBe('NOT_FOUND');
    expect(await codeOf(svc.send(ownerId, toHost({ venue_id: paused })))).toBe('NOT_FOUND');
  });

  it('refuses a venue request to a missing or malformed host id, or to someone who is not a host', async () => {
    expect(await codeOf(svc.send(ownerId, toHost({ host_user_id: null })))).toBe('BAD_USER_INPUT');
    expect(await codeOf(svc.send(ownerId, toHost({ host_user_id: 'nope' })))).toBe('BAD_USER_INPUT');
    const plain = await seedUser('Plain', false);
    expect(await codeOf(svc.send(ownerId, toHost({ host_user_id: plain })))).toBe('FORBIDDEN');
    await HostModel.create({ user_id: hostId, status: 'APPROVED', is_active: false });
    expect(await codeOf(svc.send(ownerId, toHost()))).toBe('FORBIDDEN');
  });

  it('refuses a request between a venue and its own owner, either way', async () => {
    await UserRoleModel.create({ user_id: ownerId, role: 'HOST' });
    expect(await codeOf(svc.send(ownerId, toHost({ host_user_id: ownerId })))).toBe('BAD_USER_INPUT');
    expect(await codeOf(svc.send(ownerId, { direction: 'HOST_TO_VENUE', venue_id: venueId }))).toBe('BAD_USER_INPUT');
    expect(await PartnerRequestQuotaModel.countDocuments({})).toBe(0);
  });

  it('refuses a host request from someone who is not a host', async () => {
    const plain = await seedUser('Plain', false);
    expect(await codeOf(svc.send(plain, { direction: 'HOST_TO_VENUE', venue_id: venueId }))).toBe('FORBIDDEN');
  });

  it("spends the host's own allowance on a host request, and records the pair's distance", async () => {
    await HostModel.create({ user_id: hostId, status: 'APPROVED', max_venue_requests_per_month: 1 });
    const sent = await svc.send(hostId, { direction: 'HOST_TO_VENUE', venue_id: venueId });
    expect(sent).toMatchObject({ status: 'REQUESTED', viewer_side: 'HOST', distance_km: null });
    expect(await svc.quota(hostId, 'HOST')).toEqual({ limit: 1, used: 1, remaining: 0 });
    const other = await seedVenue(ownerId);
    expect(await codeOf(svc.send(hostId, { direction: 'HOST_TO_VENUE', venue_id: other }))).toBe('LIMIT_REACHED');
  });
});

describe('send — storage failures', () => {
  it('gives the allowance back and surfaces an unexpected write failure as it is', async () => {
    const failure = new Error('write concern timeout');
    const create = jest.spyOn(PodPartnerRequestModel, 'create').mockRejectedValueOnce(failure as never);
    await expect(svc.send(ownerId, toHost())).rejects.toBe(failure);
    create.mockRestore();
    expect((await svc.quota(ownerId, 'VENUE', venueId)).used).toBe(0);
    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe('respond and cancel', () => {
  it('refuses a malformed or unknown request id', async () => {
    expect(await codeOf(svc.respond(hostId, 'nope', true))).toBe('BAD_USER_INPUT');
    expect(await codeOf(svc.respond(hostId, new Types.ObjectId().toString(), true))).toBe('NOT_FOUND');
  });

  it('declining closes the request and tells the sender', async () => {
    const sent = await svc.send(ownerId, toHost());
    createNotification.mockClear();
    const declined = await svc.respond(hostId, sent.id, false);
    expect(declined).toMatchObject({ status: 'REJECTED', viewer_side: 'HOST' });
    expect(await PodPartnerRequestModel.findById(sent.id).lean()).toMatchObject({ is_open: false, responded_at: expect.any(Date) });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Pod Request declined', target_user_ids: [ownerId] })
    );
  });

  it('lets the sender withdraw an unanswered request, silently, which frees the pair', async () => {
    const sent = await svc.send(ownerId, toHost());
    createNotification.mockClear();
    const withdrawn = await svc.cancel(ownerId, sent.id);
    expect(withdrawn).toMatchObject({ status: 'CANCELLED', viewer_side: 'VENUE' });
    expect(createNotification).not.toHaveBeenCalled();
    expect(await codeOf(svc.send(ownerId, toHost()))).toBe('OK');
  });

  it('refuses withdrawing a request that was already accepted', async () => {
    const sent = await svc.send(hostId, { direction: 'HOST_TO_VENUE', venue_id: venueId });
    await svc.respond(ownerId, sent.id, true);
    expect(await codeOf(svc.cancel(hostId, sent.id))).toBe('CONFLICT');
  });
});

describe('requestSlot edges', () => {
  it('refuses picking a slot before the request is accepted', async () => {
    const sent = await svc.send(ownerId, toHost());
    const slotId = await seedSlot(venueId, ownerId);
    expect(await codeOf(svc.requestSlot(hostId, sent.id, slotId))).toBe('CONFLICT');
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'AVAILABLE' });
  });

  it("refuses a malformed slot id and another venue's slot", async () => {
    const sent = await svc.send(ownerId, toHost());
    await svc.respond(hostId, sent.id, true);
    expect(await codeOf(svc.requestSlot(hostId, sent.id, 'nope'))).toBe('BAD_USER_INPUT');
    const elsewhere = await seedSlot(await seedVenue(ownerId), ownerId);
    expect(await codeOf(svc.requestSlot(hostId, sent.id, elsewhere))).toBe('CONFLICT');
  });

  it('gives the held slot back when the request moved on between the hold and the write', async () => {
    const sent = await svc.send(ownerId, toHost());
    await svc.respond(hostId, sent.id, true);
    const slotId = await seedSlot(venueId, ownerId);
    const race = jest.spyOn(PodPartnerRequestModel, 'findOneAndUpdate').mockResolvedValueOnce(null);
    expect(await codeOf(svc.requestSlot(hostId, sent.id, slotId))).toBe('CONFLICT');
    race.mockRestore();
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'AVAILABLE', booked_by_partner_request_id: null });
    expect(await PodPartnerRequestModel.findById(sent.id).lean()).toMatchObject({ status: 'ACCEPTED', slot_id: null });
  });

  it('refuses confirming a slot when none was requested', async () => {
    const sent = await svc.send(ownerId, toHost());
    await svc.respond(hostId, sent.id, true);
    expect(await codeOf(svc.respondSlot(ownerId, sent.id, true))).toBe('CONFLICT');
    expect(await codeOf(svc.respondSlot(ownerId, sent.id, false))).toBe('CONFLICT');
  });
});

describe('list and quota', () => {
  it("lists each side's own requests, newest first, filtered by direction and venue", async () => {
    const secondVenue = await seedVenue(ownerId);
    const otherHost = await seedUser('Dev', true);
    const a = await svc.send(ownerId, toHost());
    const b = await svc.send(hostId, { direction: 'HOST_TO_VENUE', venue_id: secondVenue });
    const c = await svc.send(ownerId, toHost({ host_user_id: otherHost }));
    // Distinct, known update times so "newest first" does not hinge on clock resolution.
    const at = (id: string, minutes: number) =>
      PodPartnerRequestModel.collection.updateOne(
        { _id: new Types.ObjectId(id) },
        { $set: { updated_at: new Date(Date.UTC(2026, 0, 1, 0, minutes)) } }
      );
    await Promise.all([at(a.id, 1), at(b.id, 2), at(c.id, 3)]);

    expect((await svc.list(ownerId, 'VENUE')).map((r) => r.id)).toEqual([c.id, b.id, a.id]);
    expect((await svc.list(ownerId, 'VENUE', 'HOST_TO_VENUE')).map((r) => r.id)).toEqual([b.id]);
    expect((await svc.list(ownerId, 'VENUE', null, venueId)).map((r) => r.id)).toEqual([c.id, a.id]);
    const hostList = await svc.list(hostId, 'HOST');
    expect(hostList.map((r) => r.id)).toEqual([b.id, a.id]);
    expect(hostList.every((r) => r.viewer_side === 'HOST')).toBe(true);
    expect(await svc.list(hostId, 'VENUE')).toEqual([]);
    expect(await codeOf(svc.list(ownerId, 'VENUE', null, 'nope'))).toBe('BAD_USER_INPUT');
  });

  it("reads the venue quota only for the venue's owner, and the host quota only for a host", async () => {
    expect(await svc.quota(ownerId, 'VENUE', venueId)).toEqual({ limit: 10, used: 0, remaining: 10 });
    expect(await codeOf(svc.quota(hostId, 'VENUE', venueId))).toBe('FORBIDDEN');
    expect(await codeOf(svc.quota(ownerId, 'VENUE', null))).toBe('BAD_USER_INPUT');
    expect(await svc.quota(hostId, 'HOST')).toEqual({ limit: 10, used: 0, remaining: 10 });
    expect(await codeOf(svc.quota(ownerId, 'HOST'))).toBe('FORBIDDEN');
  });
});

describe('pod bookkeeping', () => {
  async function confirmed() {
    const sent = await svc.send(ownerId, toHost());
    await svc.respond(hostId, sent.id, true);
    const slotId = await seedSlot(venueId, ownerId);
    await svc.requestSlot(hostId, sent.id, slotId);
    await svc.respondSlot(ownerId, sent.id, true);
    return { id: sent.id, slotId };
  }

  it('refuses a malformed or unknown request id, and a pod without the confirmed slot', async () => {
    expect(await codeOf(assertRequestReadyForPod(hostId, 'nope', null))).toBe('BAD_USER_INPUT');
    expect(await codeOf(assertRequestReadyForPod(hostId, new Types.ObjectId().toString(), null))).toBe('NOT_FOUND');
    const { id, slotId } = await confirmed();
    expect(await codeOf(assertRequestReadyForPod(hostId, id, undefined))).toBe('BAD_USER_INPUT');
    expect(await codeOf(assertRequestReadyForPod(hostId, id, null))).toBe('BAD_USER_INPUT');
    await expect(assertRequestReadyForPod(hostId, id, slotId)).resolves.toEqual({ requestId: id, slotId });
  });

  it('closes the request on the pod and tells both sides', async () => {
    const { id } = await confirmed();
    createNotification.mockClear();
    const podId = new Types.ObjectId().toString();
    await markPartnerRequestPodCreated(id, podId);
    const stored = await PodPartnerRequestModel.findById(id).lean();
    expect(stored).toMatchObject({ status: 'POD_CREATED', is_open: false });
    expect(String(stored?.pod_id)).toBe(podId);
    expect(createNotification.mock.calls.map(([n]) => n.target_user_ids[0]).sort()).toEqual([hostId, ownerId].sort());
  });

  it('leaves a request that is not SLOT_CONFIRMED alone and logs it', async () => {
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
    const sent = await svc.send(ownerId, toHost());
    createNotification.mockClear();
    await markPartnerRequestPodCreated(sent.id, new Types.ObjectId().toString());
    expect(await PodPartnerRequestModel.findById(sent.id).lean()).toMatchObject({ status: 'REQUESTED', pod_id: null });
    expect(createNotification).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('pod-partner-request', 'markPodCreated', expect.objectContaining({ request_id: sent.id }));
    warn.mockRestore();
  });

  it('expires a confirmed request whose slot started, but not one whose slot is still ahead', async () => {
    const { id, slotId } = await confirmed();
    const later = await svc.send(ownerId, toHost({ host_user_id: await seedUser('Dev', true) }));
    await PodPartnerRequestModel.updateOne(
      { _id: later.id },
      { $set: { status: 'SLOT_CONFIRMED', slot_start_at: inDays(2) } }
    );
    await PodPartnerRequestModel.updateOne({ _id: id }, { $set: { slot_start_at: inDays(-0.01) } });

    expect(await runPartnerRequestExpirySweep()).toBe(1);
    expect(await PodPartnerRequestModel.findById(id).lean()).toMatchObject({ status: 'EXPIRED' });
    expect(await VenueSlotModel.findById(slotId).lean()).toMatchObject({ status: 'AVAILABLE' });
    expect(await PodPartnerRequestModel.findById(later.id).lean()).toMatchObject({ status: 'SLOT_CONFIRMED' });
  });

  it('expires a started request that carries no slot id without touching any slot', async () => {
    const sent = await svc.send(ownerId, toHost());
    await PodPartnerRequestModel.updateOne(
      { _id: sent.id },
      { $set: { status: 'SLOT_REQUESTED', slot_id: null, slot_start_at: inDays(-1) } }
    );
    const release = jest.spyOn(VenueSlotModel, 'updateOne');
    expect(await runPartnerRequestExpirySweep(new Date())).toBe(1);
    expect(release).not.toHaveBeenCalled();
    release.mockRestore();
  });
});
