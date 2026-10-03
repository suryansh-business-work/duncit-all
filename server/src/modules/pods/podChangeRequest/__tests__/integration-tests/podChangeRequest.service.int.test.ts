/**
 * Request Change against a real Mongo: a partner files (and is charged ONCE —
 * the unique partial index makes a second filing impossible, even two at the
 * same instant), withdraws, an admin offers the place or cancels the pod, and
 * the offered partner approves or passes. The swap itself, the candidate
 * search, the row shaping, the messages, Pod Settings and Account Health are
 * faked; the request's state machine and its writes are real.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getChangeRequestHealthPenalties: jest.fn() },
}));
jest.mock('@modules/access/accountHealth/accountHealth.service', () => ({
  accountHealthService: { applySystemPenalty: jest.fn() },
}));
jest.mock('../../podChangeRequest.candidates', () => ({
  candidatesForRequest: jest.fn(),
  slotsForVenue: jest.fn(),
}));
jest.mock('../../podChangeRequest.assign', () => ({
  applyReplacement: jest.fn(),
  assertOfferableSlot: jest.fn(),
  logAssignFailure: jest.fn(),
}));
jest.mock('../../podChangeRequest.rows', () => ({
  hydrateRequests: jest.fn(async (docs: any[]) =>
    docs.map((d) => ({ id: String(d._id), status: d.status, change_request_no: d.change_request_no }))
  ),
  withoutRequesterContacts: jest.fn((row: any) => ({ ...row, redacted: true })),
}));
jest.mock('../../podChangeRequest.notify', () => ({
  ...jest.requireActual('../../podChangeRequest.notify'),
  notifyAdmins: jest.fn(),
  notifyChangeOffer: jest.fn(),
  notifyOfferPassed: jest.fn(),
  notifyRequestFiled: jest.fn(),
  notifyRequestResolved: jest.fn(),
}));
jest.mock('@modules/pods/pod/pod.service', () => ({ podService: { remove: jest.fn() } }));

import { logs } from '@observability/log';
import { settingsService } from '@modules/platform/settings/settings.service';
import { accountHealthService } from '@modules/access/accountHealth/accountHealth.service';
import { candidatesForRequest, slotsForVenue } from '../../podChangeRequest.candidates';
import { applyReplacement, assertOfferableSlot, logAssignFailure } from '../../podChangeRequest.assign';
import {
  notifyAdmins,
  notifyChangeOffer,
  notifyOfferPassed,
  notifyRequestFiled,
  notifyRequestResolved,
} from '../../podChangeRequest.notify';
import { podService } from '@modules/pods/pod/pod.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodChangeRequestModel } from '../../podChangeRequest.model';
import { podChangeRequestService } from '../../podChangeRequest.service';

const penalties = settingsService.getChangeRequestHealthPenalties as jest.Mock;
const charge = accountHealthService.applySystemPenalty as jest.Mock;
const candidates = candidatesForRequest as jest.Mock;
const venueSlots = slotsForVenue as jest.Mock;
const replace = applyReplacement as jest.Mock;
const offerableSlot = assertOfferableSlot as jest.Mock;
const assignFailed = logAssignFailure as jest.Mock;
const admins = notifyAdmins as jest.Mock;
const offered = notifyChangeOffer as jest.Mock;
const passed = notifyOfferPassed as jest.Mock;
const filed = notifyRequestFiled as jest.Mock;
const resolved = notifyRequestResolved as jest.Mock;
const removePod = podService.remove as jest.Mock;
const logError = logs.server.error as jest.Mock;

const oid = () => new Types.ObjectId();
const fails = (code: string, message: string) =>
  expect.objectContaining({ message, extensions: expect.objectContaining({ code }) });
const DUPLICATE = 'You already have an open change request for this pod. Duncit is working on it.';
const lastEvent = (doc: any) => doc.events[doc.events.length - 1];
const stored = async (id: unknown) => (await PodChangeRequestModel.findById(id).lean()) as any;

beforeAll(async () => {
  // The one-live-request-per-pod-per-role rule lives in this index.
  await PodChangeRequestModel.createIndexes();
});

beforeEach(() => {
  penalties.mockResolvedValue({ VENUE: 3, HOST: 2, CLUB_ADMIN: 1 });
  charge.mockResolvedValue(undefined);
  replace.mockResolvedValue({ summary: 'Ravi took over the pod.', moved_to: 'Ravi' });
  offerableSlot.mockResolvedValue({ start_at: new Date('2026-11-01T12:00:00Z') });
});

/* --------------------------------------------------------------- fixtures */

async function seedUser(first: string, last: string, email?: string) {
  const _id = oid();
  // auth.email is unique for any string (even ''), so a user without one leaves it unset.
  await UserModel.collection.insertOne({ _id, profile: { first_name: first, last_name: last }, auth: email ? { email } : {} });
  return _id;
}

async function seedWorld(podOver: Record<string, unknown> = {}) {
  const host = await seedUser('Asha', 'Rao');
  const owner = await seedUser('Vikram', 'Shah');
  const admin = await seedUser('Meera', 'Iyer');
  const venue = oid();
  await VenueModel.collection.insertOne({ _id: venue, venue_name: 'Play Arena', owner_user_id: owner });
  const club = oid();
  await ClubModel.collection.insertOne({ _id: club, club_name: 'Smash Club', admin_user_ids: [admin] });
  const slot = oid();
  const pod = oid();
  await PodModel.collection.insertOne({
    _id: pod,
    pod_id: `change-${String(pod)}`,
    pod_title: 'Sunday Smash',
    pod_hosts_id: [host],
    club_id: club,
    venue_id: venue,
    venue_slot_id: slot,
    venue_approval_status: 'APPROVED',
    pod_description: 'desc',
    pod_date_time: new Date(Date.now() + 72 * 3_600_000),
    pod_type: 'PAID',
    pod_attendees: [oid(), oid(), oid()],
    extra_seats: 2,
    completed_at: null,
    deleted_at: null,
    ...podOver,
  });
  return { host, owner, admin, venue, club, slot, pod };
}

const file = (w: { pod: Types.ObjectId }, userId: Types.ObjectId, role: 'HOST' | 'VENUE' | 'CLUB_ADMIN', reason = 'I cannot make it') =>
  podChangeRequestService.file(String(w.pod), String(userId), role, reason);

/** A request already OFFERED to `to`, written straight to the collection. */
async function seedOffered(w: { pod: Types.ObjectId; host: Types.ObjectId; club: Types.ObjectId }, to: Types.ObjectId, role = 'HOST', over: Record<string, unknown> = {}) {
  const _id = oid();
  await PodChangeRequestModel.collection.insertOne({
    _id,
    change_request_no: `DUN-CRQ-T${String(_id).slice(-5)}`,
    pod_id: w.pod,
    role,
    requested_by: w.host,
    from_venue_id: null,
    from_venue_slot_id: null,
    from_club_id: role === 'CLUB_ADMIN' ? w.club : null,
    reason: 'Out of town',
    status: 'OFFERED',
    resolution: 'NONE',
    is_open: true,
    health_penalty: 2,
    attendees_at_request: 5,
    offer: {
      user_id: to,
      venue_id: null,
      venue_slot_id: null,
      club_id: null,
      display_name: 'Ravi Kumar',
      status: 'PENDING',
      offered_by: oid(),
      offered_at: new Date('2026-10-01T00:00:00Z'),
      responded_at: null,
      pass_reason: '',
    },
    offer_history: [],
    events: [],
    resolved_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  });
  return _id;
}

/* ------------------------------------------------------------------- file */

describe('podChangeRequestService.file', () => {
  it('files a host request, charges the host once and tells the admins', async () => {
    const w = await seedWorld();

    const row: any = await file(w, w.host, 'HOST', `  ${'x'.repeat(600)}  `);

    const doc = await stored(row.id);
    expect(doc).toMatchObject({
      role: 'HOST',
      status: 'OPEN',
      is_open: true,
      health_penalty: 2,
      attendees_at_request: 5,
      from_venue_id: null,
      from_club_id: null,
    });
    expect(doc.reason).toHaveLength(500);
    expect(doc.change_request_no).toMatch(/^DUN-CRQ-\d{6}$/);
    expect(lastEvent(doc)).toMatchObject({ action: 'FILED', actor_name: 'Asha Rao' });
    expect(charge).toHaveBeenCalledTimes(1);
    expect(charge).toHaveBeenCalledWith({
      subject_type: 'USER',
      subject_id: String(w.host),
      points: 2,
      remark: 'Requested a change of host for the pod "Sunday Smash"',
    });
    expect(filed).toHaveBeenCalledWith(expect.anything(), 'Sunday Smash');
    expect(admins).toHaveBeenCalledWith(
      'Change Request filed',
      `${doc.change_request_no}: the host of "Sunday Smash" asked to be changed. 5 attendee(s).`
    );
    expect(row).toMatchObject({ status: 'OPEN', change_request_no: doc.change_request_no });
  });

  it('snapshots the venue being given up and charges the VENUE, not its owner', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.owner, 'VENUE');
    const doc = await stored(row.id);
    expect(String(doc.from_venue_id)).toBe(String(w.venue));
    expect(String(doc.from_venue_slot_id)).toBe(String(w.slot));
    expect(charge).toHaveBeenCalledWith(expect.objectContaining({ subject_type: 'VENUE', subject_id: String(w.venue), points: 3 }));
  });

  it('snapshots the club whose admin is leaving', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.admin, 'CLUB_ADMIN');
    const doc = await stored(row.id);
    expect(String(doc.from_club_id)).toBe(String(w.club));
    expect(doc.health_penalty).toBe(1);
  });

  it('charges nothing when the penalty is off, and keeps the request when the charge fails', async () => {
    const w = await seedWorld();
    penalties.mockResolvedValue({ VENUE: 0, HOST: 0, CLUB_ADMIN: 0 });
    const free: any = await file(w, w.host, 'HOST');
    expect((await stored(free.id)).health_penalty).toBe(0);
    expect(charge).not.toHaveBeenCalled();

    penalties.mockResolvedValue({ VENUE: 3, HOST: 2, CLUB_ADMIN: 1 });
    const error = new Error('ledger down');
    charge.mockRejectedValueOnce(error);
    const kept: any = await file(w, w.admin, 'CLUB_ADMIN');
    const doc = await stored(kept.id);
    expect(doc).toMatchObject({ status: 'OPEN', health_penalty: 0 });
    expect(logError).toHaveBeenCalledWith('podChangeRequest', 'chargeForRequest', {
      error,
      request_id: kept.id,
      role: 'CLUB_ADMIN',
    });
  });

  it('refuses a second filing for the same pod and role, and charges nothing for it', async () => {
    const w = await seedWorld();
    await file(w, w.host, 'HOST');
    await expect(file(w, w.host, 'HOST')).rejects.toEqual(fails('CONFLICT', DUPLICATE));
    expect(charge).toHaveBeenCalledTimes(1);
    expect(await PodChangeRequestModel.countDocuments({ pod_id: w.pod, role: 'HOST' })).toBe(1);
    // Another role on the same pod is its own request.
    await expect(file(w, w.admin, 'CLUB_ADMIN')).resolves.toMatchObject({ status: 'OPEN' });
  });

  it('lets exactly one of two simultaneous filings through, charging once', async () => {
    const w = await seedWorld();
    // Warm the request-number counter so the race is on the request itself.
    await file(w, w.admin, 'CLUB_ADMIN');
    charge.mockClear();

    const results = await Promise.allSettled([file(w, w.host, 'HOST'), file(w, w.host, 'HOST')]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const lost = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(lost.reason).toEqual(fails('CONFLICT', DUPLICATE));
    expect(await PodChangeRequestModel.countDocuments({ pod_id: w.pod, role: 'HOST', is_open: true })).toBe(1);
    expect(charge).toHaveBeenCalledTimes(1);
  });

  it('refuses someone who does not hold that role on the pod', async () => {
    const w = await seedWorld();
    const stranger = await seedUser('No', 'Body');
    await expect(file(w, stranger, 'HOST')).rejects.toEqual(fails('FORBIDDEN', 'You do not host this pod'));
    await expect(file(w, stranger, 'VENUE')).rejects.toEqual(
      fails('FORBIDDEN', 'This pod is not booked at a venue you own')
    );
    await expect(file(w, stranger, 'CLUB_ADMIN')).rejects.toEqual(
      fails('FORBIDDEN', 'You do not administer this pod’s club')
    );
    const pending = await seedWorld({ venue_approval_status: 'PENDING' });
    await expect(file(pending, pending.owner, 'VENUE')).rejects.toEqual(
      fails('FORBIDDEN', 'This pod is not booked at a venue you own')
    );
    expect(await PodChangeRequestModel.countDocuments({})).toBe(0);
  });

  it('refuses a malformed, missing or completed pod', async () => {
    const w = await seedWorld({ completed_at: new Date() });
    await expect(podChangeRequestService.file('nope', String(w.host), 'HOST', 'x')).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Invalid pod id')
    );
    await expect(podChangeRequestService.file(String(oid()), String(w.host), 'HOST', 'x')).rejects.toEqual(
      fails('NOT_FOUND', 'Pod not found')
    );
    await expect(file(w, w.host, 'HOST')).rejects.toEqual(
      fails('BAD_REQUEST', 'This pod is already completed — nothing left to hand over')
    );
  });

  it('names an actor with no account "Duncit" on the timeline', async () => {
    const ghost = oid();
    const w = await seedWorld();
    await PodModel.collection.updateOne({ _id: w.pod }, { $push: { pod_hosts_id: ghost } } as never);
    const row: any = await file(w, ghost, 'HOST');
    expect(lastEvent(await stored(row.id)).actor_name).toBe('Duncit');
  });
});

/* --------------------------------------------------------------- withdraw */

describe('podChangeRequestService.withdraw', () => {
  it('closes an un-offered request and frees the pod for a new one', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.host, 'HOST');

    const out: any = await podChangeRequestService.withdraw(row.id, String(w.host));

    const doc = await stored(row.id);
    expect(doc).toMatchObject({ status: 'WITHDRAWN', is_open: false });
    expect(doc.resolved_at).toBeInstanceOf(Date);
    expect(lastEvent(doc).action).toBe('WITHDRAWN');
    expect(out.status).toBe('WITHDRAWN');
    await expect(file(w, w.host, 'HOST')).resolves.toMatchObject({ status: 'OPEN' });
  });

  it('refuses someone else, an offered request, and a bad id', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.host, 'HOST');
    await expect(podChangeRequestService.withdraw(row.id, String(oid()))).rejects.toEqual(
      fails('FORBIDDEN', 'This is not your change request')
    );
    const offeredId = await seedOffered(w, oid(), 'CLUB_ADMIN');
    await expect(podChangeRequestService.withdraw(String(offeredId), String(w.host))).rejects.toEqual(
      fails('BAD_REQUEST', 'Duncit has already offered this pod to someone. Contact support to stop it.')
    );
    await expect(podChangeRequestService.withdraw('nope', String(w.host))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Invalid request id')
    );
    await expect(podChangeRequestService.withdraw(String(oid()), String(w.host))).rejects.toEqual(
      fails('NOT_FOUND', 'Change request not found')
    );
  });
});

/* ------------------------------------------------------------------ board */

describe('podChangeRequestService.board', () => {
  it("lists what I asked for and what waits on me — the latter without the requester's contacts", async () => {
    const w = await seedWorld();
    const mine: any = await file(w, w.host, 'HOST');
    const ravi = await seedUser('Ravi', 'Kumar');
    const waiting = await seedOffered(w, ravi, 'CLUB_ADMIN', { requested_by: w.admin });
    await seedOffered(w, oid(), 'VENUE', { requested_by: w.owner });

    const hostBoard: any = await podChangeRequestService.board(String(w.host));
    expect(hostBoard.mine.map((r: any) => r.id)).toEqual([mine.id]);
    expect(hostBoard.incoming).toEqual([]);
    expect(hostBoard).toMatchObject({ venue_penalty: 3, host_penalty: 2, club_admin_penalty: 1 });

    const raviBoard: any = await podChangeRequestService.board(String(ravi));
    expect(raviBoard.mine).toEqual([]);
    expect(raviBoard.incoming).toEqual([expect.objectContaining({ id: String(waiting), redacted: true })]);
  });
});

/* ---------------------------------------------------------------- respond */

describe('podChangeRequestService.respond', () => {
  it('PASS closes only the offer, keeps the pod as it is and reopens the request', async () => {
    const w = await seedWorld();
    const ravi = await seedUser('Ravi', 'Kumar');
    const id = await seedOffered(w, ravi);

    const row: any = await podChangeRequestService.respond(String(id), String(ravi), 'PASS', '  Busy that day  ');

    const doc = await stored(id);
    expect(doc).toMatchObject({ status: 'OPEN', is_open: true, offer: null });
    expect(doc.offer_history).toHaveLength(1);
    expect(doc.offer_history[0]).toMatchObject({ status: 'PASSED', pass_reason: 'Busy that day' });
    expect(doc.offer_history[0].responded_at).toBeInstanceOf(Date);
    expect(lastEvent(doc)).toMatchObject({ action: 'PASSED', actor_name: 'Ravi Kumar', note: 'Busy that day' });
    expect(passed).toHaveBeenCalledWith(expect.anything(), 'Sunday Smash', 'Ravi Kumar');
    expect(replace).not.toHaveBeenCalled();
    expect(row.status).toBe('OPEN');
    const pod: any = await PodModel.findById(w.pod).lean();
    expect(pod.pod_hosts_id.map(String)).toEqual([String(w.host)]);
  });

  it('APPROVE swaps the partner in and resolves the request', async () => {
    const w = await seedWorld();
    const ravi = await seedUser('Ravi', 'Kumar');
    const id = await seedOffered(w, ravi);

    const row: any = await podChangeRequestService.respond(String(id), String(ravi), 'APPROVE', '');

    const [request, pod, offer] = replace.mock.calls[0];
    expect(String(request._id)).toBe(String(id));
    expect(String(pod._id)).toBe(String(w.pod));
    expect(String(offer.user_id)).toBe(String(ravi));
    const doc = await stored(id);
    expect(doc).toMatchObject({ status: 'RESOLVED', resolution: 'REPLACED', is_open: false });
    expect(doc.resolved_at).toBeInstanceOf(Date);
    expect(doc.offer.status).toBe('APPROVED');
    expect(doc.offer_history[0].status).toBe('APPROVED');
    expect(lastEvent(doc)).toMatchObject({ action: 'APPROVED', note: 'Ravi took over the pod.' });
    expect(resolved).toHaveBeenCalledWith(expect.anything(), 'Sunday Smash', 'Ravi took over the pod.');
    expect(admins).toHaveBeenCalledWith('Change Request resolved', `${doc.change_request_no}: Ravi took over the pod.`);
    expect(row.status).toBe('RESOLVED');
  });

  it('leaves the request untouched, and logs, when the swap fails', async () => {
    const w = await seedWorld();
    const ravi = await seedUser('Ravi', 'Kumar');
    const id = await seedOffered(w, ravi);
    const error = new Error('slot was taken');
    replace.mockRejectedValueOnce(error);

    await expect(podChangeRequestService.respond(String(id), String(ravi), 'APPROVE', '')).rejects.toBe(error);

    expect(String(assignFailed.mock.calls[0][0]._id)).toBe(String(id));
    expect(assignFailed.mock.calls[0][1]).toBe(error);
    expect(await stored(id)).toMatchObject({ status: 'OFFERED', is_open: true, resolution: 'NONE' });
  });

  it('refuses a request not waiting on anyone, and someone it was not offered to', async () => {
    const w = await seedWorld();
    const ravi = await seedUser('Ravi', 'Kumar');
    const id = await seedOffered(w, ravi);
    await expect(podChangeRequestService.respond(String(id), String(oid()), 'APPROVE', '')).rejects.toEqual(
      fails('FORBIDDEN', 'This offer was not made to you')
    );
    const open: any = await file(w, w.owner, 'VENUE');
    await expect(podChangeRequestService.respond(open.id, String(ravi), 'PASS', '')).rejects.toEqual(
      fails('BAD_REQUEST', 'This request is no longer waiting on you')
    );
    const answered = await seedOffered(w, ravi, 'CLUB_ADMIN', {
      offer: { user_id: ravi, status: 'PASSED', display_name: '', offered_at: new Date(), pass_reason: '' },
    });
    await expect(podChangeRequestService.respond(String(answered), String(ravi), 'PASS', '')).rejects.toEqual(
      fails('BAD_REQUEST', 'This request is no longer waiting on you')
    );
  });

  it('refuses an approval once the pod is completed', async () => {
    const w = await seedWorld();
    const ravi = await seedUser('Ravi', 'Kumar');
    const id = await seedOffered(w, ravi);
    await PodModel.collection.updateOne({ _id: w.pod }, { $set: { completed_at: new Date() } });
    await expect(podChangeRequestService.respond(String(id), String(ravi), 'APPROVE', '')).rejects.toEqual(
      fails('BAD_REQUEST', 'This pod is already completed — nothing left to hand over')
    );
    expect(replace).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ admin */

describe('podChangeRequestService — admin reads', () => {
  it('adminTable lists one role, newest first, hydrated', async () => {
    const w = await seedWorld();
    const host: any = await file(w, w.host, 'HOST');
    await file(w, w.owner, 'VENUE');
    const page: any = await podChangeRequestService.adminTable('HOST', null);
    expect(page).toMatchObject({ total: 1, page: 1 });
    expect(page.rows.map((r: any) => r.id)).toEqual([host.id]);
  });

  it('adminOne returns the one row', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.host, 'HOST');
    await expect(podChangeRequestService.adminOne(row.id)).resolves.toMatchObject({ id: row.id });
  });

  it('candidates exclude the incumbents and everyone who already passed', async () => {
    const w = await seedWorld();
    const passer = oid();
    const id = await seedOffered(w, oid(), 'HOST', {
      status: 'OPEN',
      offer: null,
      offer_history: [
        { user_id: passer, status: 'PASSED', display_name: '', offered_at: new Date(), pass_reason: 'no' },
        { user_id: oid(), status: 'APPROVED', display_name: '', offered_at: new Date(), pass_reason: '' },
      ],
    });
    candidates.mockResolvedValue([{ user_id: 'c1' }]);

    await expect(podChangeRequestService.candidates(String(id))).resolves.toEqual([{ user_id: 'c1' }]);

    const [pod, role, exclude] = candidates.mock.calls[0];
    expect(String(pod._id)).toBe(String(w.pod));
    expect(role).toBe('HOST');
    expect(exclude).toEqual({ venueId: null, userIds: [String(passer), String(w.host)] });
  });

  it('candidates for a venue request exclude its venue and the requester', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.owner, 'VENUE');
    candidates.mockResolvedValue([]);
    await podChangeRequestService.candidates(row.id);
    expect(candidates.mock.calls[0][2]).toEqual({ venueId: String(w.venue), userIds: [String(w.owner)] });
  });

  it('candidates still work for a cancelled pod, and report a missing one', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.host, 'HOST');
    await PodModel.collection.updateOne({ _id: w.pod }, { $set: { deleted_at: new Date() } });
    candidates.mockResolvedValue([]);
    await expect(podChangeRequestService.candidates(row.id)).resolves.toEqual([]);
    await PodModel.collection.deleteOne({ _id: w.pod });
    await expect(podChangeRequestService.candidates(row.id)).rejects.toEqual(fails('NOT_FOUND', 'Pod not found'));
  });

  it('venueSlots only for a venue request', async () => {
    const w = await seedWorld();
    const host: any = await file(w, w.host, 'HOST');
    const venue: any = await file(w, w.owner, 'VENUE');
    venueSlots.mockResolvedValue([{ id: 's1' }]);
    await expect(podChangeRequestService.venueSlots(host.id, 'v1')).rejects.toEqual(
      fails('BAD_REQUEST', 'Only a venue request picks a slot')
    );
    await expect(podChangeRequestService.venueSlots(venue.id, 'v1')).resolves.toEqual([{ id: 's1' }]);
    expect(venueSlots).toHaveBeenCalledWith('v1');
  });
});

/* ------------------------------------------------------------------ offer */

describe('podChangeRequestService.offer', () => {
  it('offers a host place to a partner without touching the pod', async () => {
    const w = await seedWorld();
    const adminId = await seedUser('Duncit', 'Ops');
    const ravi = await seedUser('Ravi', 'Kumar');
    const row: any = await file(w, w.host, 'HOST');

    await podChangeRequestService.offer(row.id, String(adminId), { user_id: String(ravi) });

    const doc = await stored(row.id);
    expect(doc.status).toBe('OFFERED');
    expect(doc.is_open).toBe(true);
    expect(doc.offer).toMatchObject({ display_name: 'Ravi Kumar', status: 'PENDING', venue_id: null, club_id: null, pass_reason: '' });
    expect(String(doc.offer.user_id)).toBe(String(ravi));
    expect(String(doc.offer.offered_by)).toBe(String(adminId));
    expect(lastEvent(doc)).toMatchObject({ action: 'OFFERED', actor_name: 'Duncit Ops', note: 'Offered to Ravi Kumar' });
    expect(offerableSlot).not.toHaveBeenCalled();
    const [, pod, to, slotStart] = offered.mock.calls[0];
    expect(String(pod._id)).toBe(String(w.pod));
    expect(to).toBe(String(ravi));
    expect(slotStart).toBeNull();
  });

  it('checks the venue slot before offering a venue place, and passes its start along', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.owner, 'VENUE');
    const other = await seedUser('', '', 'other-venue@example.com');
    const venue = String(oid());
    const slot = String(oid());

    await podChangeRequestService.offer(row.id, String(oid()), { user_id: String(other), venue_id: venue, venue_slot_id: slot });

    expect(offerableSlot).toHaveBeenCalledWith(venue, slot);
    const doc = await stored(row.id);
    expect(doc.offer.display_name).toBe('other-venue@example.com');
    expect(String(doc.offer.venue_id)).toBe(venue);
    expect(String(doc.offer.venue_slot_id)).toBe(slot);
    expect(offered.mock.calls[0][3]).toEqual(new Date('2026-11-01T12:00:00Z'));
  });

  it('offers a club admin place on the club the request came from', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.admin, 'CLUB_ADMIN');
    const ravi = await seedUser('Ravi', 'Kumar');
    await podChangeRequestService.offer(row.id, String(oid()), { user_id: String(ravi) });
    expect(String((await stored(row.id)).offer.club_id)).toBe(String(w.club));
  });

  it('refuses an offered or closed request, no candidate, a missing slot pick and a vanished partner', async () => {
    const w = await seedWorld();
    const offeredId = await seedOffered(w, oid());
    await expect(podChangeRequestService.offer(String(offeredId), String(oid()), { user_id: String(oid()) })).rejects.toEqual(
      fails('BAD_REQUEST', 'This pod is already offered to someone. Wait for their answer first.')
    );
    const closedId = await seedOffered(w, oid(), 'CLUB_ADMIN', { status: 'WITHDRAWN', is_open: false, offer: null });
    await expect(podChangeRequestService.offer(String(closedId), String(oid()), { user_id: String(oid()) })).rejects.toEqual(
      fails('BAD_REQUEST', 'This request is already closed.')
    );
    const venueRow: any = await file(w, w.owner, 'VENUE');
    await expect(podChangeRequestService.offer(venueRow.id, String(oid()), { user_id: 'nope' })).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Pick somebody to offer it to')
    );
    await expect(
      podChangeRequestService.offer(venueRow.id, String(oid()), { user_id: String(oid()), venue_id: String(oid()) })
    ).rejects.toEqual(fails('BAD_USER_INPUT', 'Pick a venue and one of its slots'));
    await expect(
      podChangeRequestService.offer(venueRow.id, String(oid()), {
        user_id: String(oid()),
        venue_id: String(oid()),
        venue_slot_id: String(oid()),
      })
    ).rejects.toEqual(fails('NOT_FOUND', 'That partner no longer has an account'));
    expect((await stored(venueRow.id)).status).toBe('OPEN');
    expect(offered).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------- cancel / close all */

describe('podChangeRequestService.cancelPod and closeAllForPod', () => {
  it('cancels through the one cancel-and-refund path, which closes every open request', async () => {
    const w = await seedWorld();
    const hostRow: any = await file(w, w.host, 'HOST');
    const ravi = oid();
    const offeredId = await seedOffered(w, ravi, 'CLUB_ADMIN');
    const adminId = String(oid());
    removePod.mockImplementation(async (podId: string) => {
      await podChangeRequestService.closeAllForPod(podId, 'Pod cancelled by Duncit');
    });

    const row: any = await podChangeRequestService.cancelPod(hostRow.id, adminId, '  The venue flooded  ');

    expect(removePod).toHaveBeenCalledWith(String(w.pod), { actorUserId: adminId, source: 'ADMIN', note: 'The venue flooded' });
    expect(row.status).toBe('RESOLVED');
    for (const id of [hostRow.id, offeredId]) {
      const doc = await stored(id);
      expect(doc).toMatchObject({ status: 'RESOLVED', resolution: 'POD_CANCELLED', is_open: false, offer: null });
      expect(lastEvent(doc)).toMatchObject({ action: 'POD_CANCELLED', actor_user_id: null, actor_name: 'Duncit', note: 'Pod cancelled by Duncit' });
    }
    const passedOffer = (await stored(offeredId)).offer_history[0];
    expect(passedOffer.status).toBe('PASSED');
    expect(String(passedOffer.user_id)).toBe(String(ravi));
  });

  it('refuses a closed request and a reason too short to explain anything', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.host, 'HOST');
    await expect(podChangeRequestService.cancelPod(row.id, String(oid()), ' no ')).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Say why the pod is being cancelled')
    );
    await podChangeRequestService.withdraw(row.id, String(w.host));
    await expect(podChangeRequestService.cancelPod(row.id, String(oid()), 'The venue flooded')).rejects.toEqual(
      fails('BAD_REQUEST', 'This request is already closed')
    );
    expect(removePod).not.toHaveBeenCalled();
  });

  it('leaves closed requests alone, ignores a bad id, and never throws', async () => {
    const w = await seedWorld();
    const row: any = await file(w, w.host, 'HOST');
    await podChangeRequestService.withdraw(row.id, String(w.host));

    await podChangeRequestService.closeAllForPod(String(w.pod), 'gone');
    expect((await stored(row.id)).status).toBe('WITHDRAWN');

    await expect(podChangeRequestService.closeAllForPod('nope', 'gone')).resolves.toBeUndefined();

    const error = new Error('db down');
    const find = jest.spyOn(PodChangeRequestModel, 'find').mockImplementationOnce((() => Promise.reject(error)) as never);
    await expect(podChangeRequestService.closeAllForPod(String(w.pod), 'gone')).resolves.toBeUndefined();
    find.mockRestore();
    expect(logError).toHaveBeenCalledWith('podChangeRequest', 'closeAllForPod', { error, pod_id: String(w.pod) });
  });

  it('penalties reads the Pod Settings values', async () => {
    await expect(podChangeRequestService.penalties()).resolves.toEqual({ VENUE: 3, HOST: 2, CLUB_ADMIN: 1 });
  });
});
