/**
 * The swap itself, once a replacement has said yes. Every model and service is
 * faked; what is under test is what each role's swap writes onto the pod (or
 * the club), the order the venue slot is claimed and released in — claim
 * first, so a lost race leaves the pod on its original booking — and every
 * refusal on the way.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('@modules/clubs/club/club.model', () => ({ ClubModel: { findById: jest.fn(), findOne: jest.fn() } }));
jest.mock('@modules/clubs/club/club.service', () => ({ clubService: { syncClubAdminRoles: jest.fn() } }));
jest.mock('@modules/venues/venue/venue.model', () => ({ VenueModel: { findById: jest.fn(), findOne: jest.fn() } }));
jest.mock('@modules/venues/venueSlot/venueSlot.model', () => ({ VenueSlotModel: { findOne: jest.fn() } }));
jest.mock('@modules/venues/venueSlot/venueSlot.service', () => ({
  venueSlotService: { bookForPod: jest.fn(), releaseSlotForPod: jest.fn() },
}));
jest.mock('@modules/pods/pod/pod.service', () => ({
  assertActiveHost: jest.fn(),
  resolveVenueLocation: jest.fn(),
}));
jest.mock('@modules/pods/podAudit/podAudit.service', () => ({ podAuditService: { record: jest.fn() } }));
jest.mock('../../podChangeRequest.notify', () => ({ notifyAttendeesOfVenueChange: jest.fn() }));
jest.mock('@utils/app-time', () => ({
  ...jest.requireActual('@utils/app-time'),
  appDateTime: (d: Date) => `AT(${new Date(d).toISOString()})`,
}));

import { logs } from '@observability/log';
import { ClubModel } from '@modules/clubs/club/club.model';
import { clubService } from '@modules/clubs/club/club.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { assertActiveHost, resolveVenueLocation } from '@modules/pods/pod/pod.service';
import { podAuditService } from '@modules/pods/podAudit/podAudit.service';
import { notifyAttendeesOfVenueChange } from '../../podChangeRequest.notify';
import { applyReplacement, assertOfferableSlot, logAssignFailure } from '../../podChangeRequest.assign';
import type { IPodChangeOffer, IPodChangeRequest } from '../../podChangeRequest.model';

const clubFind = ClubModel.findById as jest.Mock;
const syncRoles = clubService.syncClubAdminRoles as jest.Mock;
const venueFind = VenueModel.findById as jest.Mock;
const slotFindOne = VenueSlotModel.findOne as jest.Mock;
const bookForPod = venueSlotService.bookForPod as jest.Mock;
const releaseSlot = venueSlotService.releaseSlotForPod as jest.Mock;
const activeHost = assertActiveHost as jest.Mock;
const resolvePlace = resolveVenueLocation as jest.Mock;
const audit = podAuditService.record as jest.Mock;
const notifyAttendees = notifyAttendeesOfVenueChange as jest.Mock;
const logError = logs.server.error as jest.Mock;

const id = (n: number) => new Types.ObjectId(`65f0000000000000000000${String(n).padStart(2, '0')}`);
const REQUESTER = id(1);
const REPLACEMENT = id(2);
const CO_HOST = id(3);
const POD = id(10);
const CLUB = id(11);
const OLD_SLOT = id(12);
const NEW_SLOT = id(13);
const NEW_VENUE = id(14);
const LOCATION = id(15);
const START = new Date('2026-11-01T12:00:00Z');
const END = new Date('2026-11-01T14:00:00Z');

const fails = (code: string, message: string) =>
  expect.objectContaining({ message, extensions: expect.objectContaining({ code }) });

const request = (role: IPodChangeRequest['role'], over: Record<string, unknown> = {}) =>
  ({
    _id: id(20),
    change_request_no: 'DUN-CRQ-000007',
    role,
    requested_by: REQUESTER,
    from_club_id: null,
    ...over,
  }) as unknown as IPodChangeRequest;

const offer = (over: Record<string, unknown> = {}) =>
  ({
    user_id: REPLACEMENT,
    venue_id: NEW_VENUE,
    venue_slot_id: NEW_SLOT,
    display_name: 'Ravi Kumar',
    ...over,
  }) as unknown as IPodChangeOffer;

const makePod = (over: Record<string, unknown> = {}) => ({
  _id: POD,
  club_id: CLUB,
  venue_id: id(16),
  venue_slot_id: OLD_SLOT,
  pod_hosts_id: [REQUESTER, CO_HOST],
  venue_approval_status: 'PENDING',
  is_active: false,
  save: jest.fn().mockResolvedValue(undefined),
  toObject: () => ({ snapshot: 'before' }),
  ...over,
});

/** `findOne().lean()` and `findById().select()` as one-link chains. */
const leanOf = (value: unknown) => ({ lean: () => Promise.resolve(value) });
const selectOf = (value: unknown) => ({ select: () => Promise.resolve(value) });

beforeEach(() => {
  slotFindOne.mockReturnValue(leanOf({ _id: NEW_SLOT, start_at: new Date(Date.now() + 86_400_000) }));
  venueFind.mockReturnValue(selectOf({ venue_name: 'Play Arena', owner_user_id: REPLACEMENT }));
  bookForPod.mockResolvedValue({ _id: NEW_SLOT, start_at: START, end_at: END });
  releaseSlot.mockResolvedValue(undefined);
  resolvePlace.mockResolvedValue({ venue_id: NEW_VENUE, location_id: LOCATION, zone_name: 'HSR' });
  activeHost.mockResolvedValue(undefined);
  audit.mockResolvedValue(undefined);
  notifyAttendees.mockResolvedValue(undefined);
  syncRoles.mockResolvedValue(undefined);
});

describe('assertOfferableSlot', () => {
  it('returns a free, future slot of that venue', async () => {
    const slot = await assertOfferableSlot(String(NEW_VENUE), String(NEW_SLOT));
    expect(slot._id).toBe(NEW_SLOT);
    expect(slotFindOne).toHaveBeenCalledWith({ _id: NEW_SLOT, venue_id: NEW_VENUE, status: 'AVAILABLE' });
  });

  it('refuses a malformed id, a taken slot and one that has started', async () => {
    await expect(assertOfferableSlot(String(NEW_VENUE), 'nope')).rejects.toEqual(fails('BAD_USER_INPUT', 'Invalid slot'));
    slotFindOne.mockReturnValueOnce(leanOf(null));
    await expect(assertOfferableSlot(String(NEW_VENUE), String(NEW_SLOT))).rejects.toEqual(
      fails('CONFLICT', 'That slot is no longer available. Pick another one.')
    );
    slotFindOne.mockReturnValueOnce(leanOf({ start_at: new Date(Date.now() - 1000) }));
    await expect(assertOfferableSlot(String(NEW_VENUE), String(NEW_SLOT))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'That slot has already started. Pick a later one.')
    );
  });
});

describe('applyReplacement — VENUE', () => {
  it('books the new slot BEFORE releasing the old one, and moves the pod onto it approved', async () => {
    const pod = makePod();

    const outcome = await applyReplacement(request('VENUE'), pod, offer());

    expect(bookForPod).toHaveBeenCalledWith(String(NEW_SLOT), String(NEW_VENUE), String(POD));
    expect(releaseSlot).toHaveBeenCalledWith(String(OLD_SLOT), String(POD));
    expect(bookForPod.mock.invocationCallOrder[0]).toBeLessThan(releaseSlot.mock.invocationCallOrder[0]);
    expect(pod.save.mock.invocationCallOrder[0]).toBeLessThan(releaseSlot.mock.invocationCallOrder[0]);
    expect(resolvePlace).toHaveBeenCalledWith({
      venue_id: String(NEW_VENUE),
      location_id: null,
      club_id: String(CLUB),
      zone_name: null,
      venue_slot_id: String(NEW_SLOT),
    });
    expect(pod).toMatchObject({
      venue_id: NEW_VENUE,
      location_id: LOCATION,
      zone_name: 'HSR',
      venue_slot_id: NEW_SLOT,
      pod_date_time: START,
      pod_end_date_time: END,
      venue_approval_status: 'APPROVED',
      is_active: true,
    });
    expect(audit).toHaveBeenCalledWith({
      pod,
      action: 'UPDATE',
      source: 'ADMIN',
      actorUserId: String(REPLACEMENT),
      before: { snapshot: 'before' },
      note: `Change request DUN-CRQ-000007: venue moved to Play Arena (AT(${START.toISOString()}))`,
    });
    expect(notifyAttendees).toHaveBeenCalledWith(pod, 'Play Arena', `AT(${START.toISOString()})`);
    expect(outcome).toEqual({
      summary: `Play Arena took the pod on AT(${START.toISOString()}).`,
      moved_to: `Play Arena · AT(${START.toISOString()})`,
    });
  });

  it('releases nothing when the pod held no slot, or the same one', async () => {
    const slotless = makePod({ venue_slot_id: null });
    await applyReplacement(request('VENUE'), slotless, offer());
    const same = makePod({ venue_slot_id: NEW_SLOT });
    await applyReplacement(request('VENUE'), same, offer());
    expect(releaseSlot).not.toHaveBeenCalled();
  });

  it('keeps the pod on its booking when the new slot cannot be claimed', async () => {
    const pod = makePod();
    bookForPod.mockRejectedValueOnce(new Error('slot already booked'));
    await expect(applyReplacement(request('VENUE'), pod, offer())).rejects.toThrow('slot already booked');
    expect(pod.save).not.toHaveBeenCalled();
    expect(releaseSlot).not.toHaveBeenCalled();
    expect(pod.venue_slot_id).toBe(OLD_SLOT);
  });

  it('records an open-ended slot as having no end', async () => {
    bookForPod.mockResolvedValueOnce({ _id: NEW_SLOT, start_at: START });
    const pod = makePod();
    await applyReplacement(request('VENUE'), pod, offer());
    expect(pod).toMatchObject({ pod_end_date_time: null });
  });

  it('refuses an offer with no slot, a vanished venue, a venue no longer theirs and a gone slot', async () => {
    await expect(applyReplacement(request('VENUE'), makePod(), offer({ venue_slot_id: null }))).rejects.toEqual(
      fails('BAD_REQUEST', 'This offer carries no venue slot')
    );
    await expect(applyReplacement(request('VENUE'), makePod(), offer({ venue_id: null }))).rejects.toEqual(
      fails('BAD_REQUEST', 'This offer carries no venue slot')
    );
    venueFind.mockReturnValueOnce(selectOf(null));
    await expect(applyReplacement(request('VENUE'), makePod(), offer())).rejects.toEqual(fails('NOT_FOUND', 'Venue not found'));
    venueFind.mockReturnValueOnce(selectOf({ venue_name: 'Play Arena', owner_user_id: id(99) }));
    await expect(applyReplacement(request('VENUE'), makePod(), offer())).rejects.toEqual(
      fails('FORBIDDEN', 'This venue is no longer yours')
    );
    slotFindOne.mockReturnValueOnce(leanOf(null));
    await expect(applyReplacement(request('VENUE'), makePod(), offer())).rejects.toEqual(
      fails('CONFLICT', 'That slot is no longer available. Pick another one.')
    );
    expect(bookForPod).not.toHaveBeenCalled();
  });
});

describe('applyReplacement — HOST', () => {
  it('puts the replacement in the requester’s position, so the owner stays the owner', async () => {
    const pod = makePod();

    const outcome = await applyReplacement(request('HOST'), pod, offer());

    expect(activeHost).toHaveBeenCalledWith(String(REPLACEMENT));
    expect(pod.pod_hosts_id.map(String)).toEqual([String(REPLACEMENT), String(CO_HOST)]);
    expect(pod.save).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        actorUserId: String(REPLACEMENT),
        before: { snapshot: 'before' },
        note: 'Change request DUN-CRQ-000007: host handed over to Ravi Kumar',
      })
    );
    expect(outcome).toEqual({ summary: 'Ravi Kumar took over the pod.', moved_to: 'Ravi Kumar' });
  });

  it('adds the replacement when the requester is no longer listed, and words a nameless one', async () => {
    const pod = makePod({ pod_hosts_id: [CO_HOST] });
    const outcome = await applyReplacement(request('HOST'), pod, offer({ display_name: '' }));
    expect(pod.pod_hosts_id.map(String)).toEqual([String(CO_HOST), String(REPLACEMENT)]);
    expect(outcome.summary).toBe('A new host took over the pod.');
    expect(audit.mock.calls[0][0].note).toBe(`Change request DUN-CRQ-000007: host handed over to ${String(REPLACEMENT)}`);
  });

  it('refuses a host already on the pod, and an inactive host', async () => {
    await expect(applyReplacement(request('HOST'), makePod(), offer({ user_id: CO_HOST }))).rejects.toEqual(
      fails('BAD_REQUEST', 'That host already runs this pod')
    );
    activeHost.mockRejectedValueOnce(new Error('Host is not active'));
    const pod = makePod();
    await expect(applyReplacement(request('HOST'), pod, offer())).rejects.toThrow('Host is not active');
    expect(pod.save).not.toHaveBeenCalled();
  });
});

describe('applyReplacement — CLUB_ADMIN', () => {
  const club = (admins: Types.ObjectId[]) => ({
    club_name: 'Smash Club',
    admin_user_ids: admins,
    save: jest.fn().mockResolvedValue(undefined),
  });

  it("swaps who administers the request's club and keeps the role grants in step", async () => {
    const other = id(30);
    const theClub = club([REQUESTER, other]);
    clubFind.mockResolvedValue(theClub);

    const outcome = await applyReplacement(request('CLUB_ADMIN', { from_club_id: CLUB }), makePod({ club_id: id(31) }), offer());

    expect(clubFind).toHaveBeenCalledWith(String(CLUB));
    expect(theClub.admin_user_ids.map(String)).toEqual([String(other), String(REPLACEMENT)]);
    expect(theClub.save).toHaveBeenCalledTimes(1);
    expect(syncRoles).toHaveBeenCalledWith([String(REQUESTER), String(other)], [String(other), String(REPLACEMENT)]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'Change request DUN-CRQ-000007: Smash Club handed to Ravi Kumar' })
    );
    expect(outcome).toEqual({ summary: 'Ravi Kumar now administers Smash Club.', moved_to: 'Smash Club' });
  });

  it("falls back to the pod's club, and never lists the newcomer twice", async () => {
    const theClub = club([REQUESTER, REPLACEMENT]);
    clubFind.mockResolvedValue(theClub);
    const outcome = await applyReplacement(request('CLUB_ADMIN'), makePod(), offer({ display_name: '' }));
    expect(clubFind).toHaveBeenCalledWith(String(CLUB));
    expect(theClub.admin_user_ids.map(String)).toEqual([String(REPLACEMENT)]);
    expect(outcome.summary).toBe('A new club admin now administers Smash Club.');
  });

  it('refuses a pod with no club and a club that no longer exists', async () => {
    await expect(applyReplacement(request('CLUB_ADMIN'), makePod({ club_id: null }), offer())).rejects.toEqual(
      fails('BAD_REQUEST', 'This pod has no club')
    );
    clubFind.mockResolvedValue(null);
    await expect(applyReplacement(request('CLUB_ADMIN'), makePod(), offer())).rejects.toEqual(fails('NOT_FOUND', 'Club not found'));
    expect(syncRoles).not.toHaveBeenCalled();
  });
});

describe('logAssignFailure', () => {
  it('logs the request it was for', () => {
    const error = new Error('boom');
    logAssignFailure(request('HOST'), error);
    expect(logError).toHaveBeenCalledWith('podChangeRequest', 'applyReplacement', {
      error,
      request_id: String(id(20)),
      change_request_no: 'DUN-CRQ-000007',
      role: 'HOST',
    });
  });
});
