/**
 * The three enrolments — a venue accepting with a slot, a host assigning
 * themselves, a club admin claiming for a club — against a real Mongo. What is
 * under test is the guard order (paused, turn order, ownership, category,
 * city), the location pin each first enrolment writes, and the single
 * conditional write that decides a race: exactly one partner per role wins,
 * and a losing venue gives back only the slot it booked. Finance, the
 * slot-booking service, the pod funnel and the notifications are faked.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('../../autoPod.notify', () => ({
  autoPodNotify: { enrolled: jest.fn(), withdrawn: jest.fn(), live: jest.fn(), opened: jest.fn() },
}));
jest.mock('@modules/pods/pod/pod.service', () => ({
  assertActiveHost: jest.fn(),
  podService: { create: jest.fn() },
  validateFutureDates: jest.fn(),
  validateMeetingDetails: jest.fn(),
  buildProductRequests: jest.fn(),
  validateHasImage: jest.fn(),
}));
jest.mock('@modules/finance/finance/breakdown.service', () => ({
  breakdownService: { assertViablePodEconomics: jest.fn(), potentialPodEarnings: jest.fn() },
  venueSlotProjections: jest.fn(),
}));
jest.mock('@modules/venues/venueSlot/venueSlot.service', () => ({
  ensureOwnedVenue: jest.fn(),
  venueSlotService: { bookForAutoPod: jest.fn(), releaseAutoPodSlot: jest.fn(), releaseForAutoPod: jest.fn() },
}));
jest.mock('@modules/clubs/clubAdmin/clubAdmin.service', () => ({
  clubAdminService: { assertClubAdmin: jest.fn() },
}));
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getAppSettings: jest.fn() },
}));
jest.mock('@modules/access/accountHealth/accountHealth.service', () => ({
  accountHealthService: { applySystemPenalty: jest.fn() },
}));

import { logs } from '@observability/log';
import { autoPodNotify } from '../../autoPod.notify';
import {
  assertActiveHost,
  podService,
  validateFutureDates,
  validateMeetingDetails,
} from '@modules/pods/pod/pod.service';
import { breakdownService } from '@modules/finance/finance/breakdown.service';
import { ensureOwnedVenue, venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { clubAdminService } from '@modules/clubs/clubAdmin/clubAdmin.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { AutoPodModel } from '../../autoPod.model';
import { clubClaimAutoPod, hostAssignAutoPod, venueAcceptAutoPod } from '../../autoPod.claims';
import {
  clubClaim,
  HOUR_MS,
  hostClaim,
  insertAutoPod,
  loadRaw,
  oid,
  pinnedTo,
  seedCategoryTree,
  seedClub,
  seedHost,
  seedLocation,
  seedSlot,
  seedUser,
  venueClaim,
} from './autoPod.fixtures';

const enrolled = autoPodNotify.enrolled as jest.Mock;
const activeHost = assertActiveHost as jest.Mock;
const createPod = podService.create as jest.Mock;
const futureDates = validateFutureDates as jest.Mock;
const meetingDetails = validateMeetingDetails as jest.Mock;
const viable = breakdownService.assertViablePodEconomics as jest.Mock;
const ownedVenue = ensureOwnedVenue as jest.Mock;
const book = venueSlotService.bookForAutoPod as jest.Mock;
const releaseSlot = venueSlotService.releaseAutoPodSlot as jest.Mock;
const clubAdmin = clubAdminService.assertClubAdmin as jest.Mock;
const appSettings = settingsService.getAppSettings as jest.Mock;
const logError = logs.server.error as jest.Mock;

const fails = (code: string, message: string) =>
  expect.objectContaining({ message, extensions: expect.objectContaining({ code }) });
const lastEvent = (doc: any) => doc.events[doc.events.length - 1];
const flush = () => new Promise((resolve) => setImmediate(resolve));
const MISMATCH = (who: string) => `This Auto Pod is in Bengaluru, Karnataka — ${who} must be in that city too`;

beforeEach(() => {
  appSettings.mockResolvedValue({
    auto_pod_slot_window_days: 7,
    auto_pod_venue_expiry_hours: 24,
    auto_pod_assignment_expiry_hours: 72,
    auto_pod_cancel_health_penalty: 5,
  });
  enrolled.mockResolvedValue(undefined);
  activeHost.mockResolvedValue(undefined);
  viable.mockResolvedValue(undefined);
  book.mockResolvedValue(undefined);
  releaseSlot.mockResolvedValue(undefined);
  clubAdmin.mockResolvedValue(undefined);
});

/* ------------------------------------------------------------------ venue */

describe('venueAcceptAutoPod', () => {
  async function setup(over: { venue?: Record<string, unknown>; offer?: Record<string, unknown>; slot?: Record<string, unknown> } = {}) {
    const owner = oid();
    const sub = oid();
    const city = await seedLocation();
    const venueId = oid();
    ownedVenue.mockImplementation(async (userId: string, id: string) => ({
      _id: new Types.ObjectId(id),
      owner_user_id: owner,
      venue_name: 'Play Arena',
      status: 'APPROVED',
      is_active: true,
      venue_category: { sub_category_id: sub },
      location_id: city,
      ...over.venue,
    }));
    const slot = await seedSlot({ venue_id: venueId, owner_user_id: owner, price: 700, ...over.slot });
    const offer = await insertAutoPod({ sub_category_id: sub, ...over.offer });
    return { owner, sub, city, venueId, slot, offer };
  }

  it('books its own slot, enrols, pins the venue city and pauses its clock', async () => {
    const s = await setup();
    await AutoPodModel.updateOne(
      { _id: s.offer },
      { $set: { viewer_windows: [{ user_id: s.owner, started_at: new Date(Date.now() - HOUR_MS), consumed_ms: 0 }] } }
    );

    const pub: any = await venueAcceptAutoPod(String(s.owner), String(s.offer), String(s.venueId), String(s.slot));

    expect(viable).toHaveBeenCalledWith({
      hostUserId: null,
      podAmount: 0,
      noOfSpots: 0,
      venueId: String(s.venueId),
      venueAmount: 700,
    });
    expect(book).toHaveBeenCalledWith(String(s.slot), String(s.venueId), String(s.owner), String(s.offer));
    expect(pub.stage).toBe('CLAIMING');
    expect(pub.venue_claim).toMatchObject({
      venue_id: String(s.venueId),
      venue_slot_id: String(s.slot),
      owner_user_id: String(s.owner),
      venue_name: 'Play Arena',
      slot_price: 700,
    });
    expect(pub.location).toMatchObject({ location_id: String(s.city), bound_by: 'VENUE' });
    expect(lastEvent(pub)).toMatchObject({
      action: 'VENUE_ENROLL',
      actor_name: 'Play Arena',
      note: 'Venue accepted and picked a slot — pinned to Bengaluru, Karnataka',
    });
    const stored: any = await loadRaw(s.offer);
    expect(stored.viewer_windows[0].started_at).toBeNull();
    expect(stored.viewer_windows[0].consumed_ms).toBeGreaterThanOrEqual(HOUR_MS);
    expect(enrolled).toHaveBeenCalledTimes(1);
    expect(enrolled.mock.calls[0][1]).toBe('venue');
    expect(releaseSlot).not.toHaveBeenCalled();
  });

  it('prices the slot under the host already on the offer', async () => {
    const host = oid();
    const s = await setup({ offer: { pod_amount: 500, no_of_spots: 10, host_claim: hostClaim(host), stage: 'CLAIMING' } });
    await venueAcceptAutoPod(String(s.owner), String(s.offer), String(s.venueId), String(s.slot));
    expect(viable).toHaveBeenCalledWith(expect.objectContaining({ hostUserId: String(host), podAmount: 500, noOfSpots: 10 }));
  });

  it('refuses a paused, virtual, taken or finished offer before touching any slot', async () => {
    const paused = await setup({ offer: { is_active: false } });
    await expect(
      venueAcceptAutoPod(String(paused.owner), String(paused.offer), String(paused.venueId), String(paused.slot))
    ).rejects.toEqual(fails('CONFLICT', 'This Auto Pod is paused — try again once the admin resumes it'));

    const virtual = await setup({ offer: { pod_mode: 'VIRTUAL' } });
    await expect(
      venueAcceptAutoPod(String(virtual.owner), String(virtual.offer), String(virtual.venueId), String(virtual.slot))
    ).rejects.toEqual(fails('BAD_REQUEST', 'A virtual Auto Pod has no venue — it needs only a host and a club'));

    for (const offer of [{ stage: 'CLAIMING', venue_claim: venueClaim() }, { stage: 'EXPIRED' }]) {
      const s = await setup({ offer });
      await expect(
        venueAcceptAutoPod(String(s.owner), String(s.offer), String(s.venueId), String(s.slot))
      ).rejects.toEqual(fails('CONFLICT', 'This Auto Pod has already been accepted by another venue.'));
    }
    expect(book).not.toHaveBeenCalled();
  });

  it('refuses a venue that is not approved, in another category, cityless or in another city', async () => {
    const cases: [Parameters<typeof setup>[0], string, string][] = [
      [{ venue: { status: 'SUBMITTED' } }, 'FORBIDDEN', 'Only an approved, active venue can accept an Auto Pod'],
      [{ venue: { is_active: false } }, 'FORBIDDEN', 'Only an approved, active venue can accept an Auto Pod'],
      [{ venue: { venue_category: { sub_category_id: oid() } } }, 'BAD_USER_INPUT', "This Auto Pod's category does not match that venue"],
      [{ venue: { location_id: null } }, 'BAD_USER_INPUT', 'Set a location on this venue before accepting an Auto Pod'],
      [{ offer: { location: pinnedTo(oid(), 'HOST') } }, 'BAD_USER_INPUT', MISMATCH('the venue')],
    ];
    for (const [over, code, message] of cases) {
      const s = await setup(over);
      await expect(
        venueAcceptAutoPod(String(s.owner), String(s.offer), String(s.venueId), String(s.slot))
      ).rejects.toEqual(fails(code, message));
    }
    expect(book).not.toHaveBeenCalled();
  });

  it('refuses a slot that is malformed, missing, someone else’s or already started', async () => {
    const s = await setup();
    const call = (slotId: string, venueId = String(s.venueId)) =>
      venueAcceptAutoPod(String(s.owner), String(s.offer), venueId, slotId);
    const foreign = await seedSlot({ venue_id: s.venueId, owner_user_id: oid() });
    const otherVenue = await seedSlot({ venue_id: oid(), owner_user_id: s.owner });
    const started = await seedSlot({ venue_id: s.venueId, owner_user_id: s.owner, start_at: new Date(Date.now() - 1000) });

    await expect(call('bad')).rejects.toEqual(fails('BAD_USER_INPUT', 'Invalid slot_id'));
    await expect(call(String(oid()))).rejects.toEqual(fails('NOT_FOUND', 'Selected slot not found'));
    await expect(call(String(foreign))).rejects.toEqual(fails('FORBIDDEN', 'That slot does not belong to this venue'));
    await expect(call(String(otherVenue))).rejects.toEqual(fails('FORBIDDEN', 'That slot does not belong to this venue'));
    await expect(call(String(started))).rejects.toEqual(fails('BAD_USER_INPUT', 'Pick a slot in the future'));
    expect(book).not.toHaveBeenCalled();
    expect((await loadRaw(s.offer))?.venue_claim).toBeNull();
  });

  it('books nothing when the pod money cannot cover the slot', async () => {
    const s = await setup();
    viable.mockRejectedValueOnce(new Error('Host earnings would be negative'));
    await expect(
      venueAcceptAutoPod(String(s.owner), String(s.offer), String(s.venueId), String(s.slot))
    ).rejects.toThrow('Host earnings would be negative');
    expect(book).not.toHaveBeenCalled();
  });

  it('gives back only its own slot when another venue won while it was booking', async () => {
    const s = await setup();
    const winner = venueClaim();
    book.mockImplementationOnce(async () => {
      await AutoPodModel.updateOne({ _id: s.offer }, { $set: { venue_claim: winner, stage: 'CLAIMING' } });
    });

    await expect(
      venueAcceptAutoPod(String(s.owner), String(s.offer), String(s.venueId), String(s.slot))
    ).rejects.toEqual(fails('CONFLICT', 'This Auto Pod has already been accepted by another venue.'));

    expect(releaseSlot).toHaveBeenCalledWith(String(s.slot), String(s.offer));
    const stored: any = await loadRaw(s.offer);
    expect(String(stored.venue_claim.venue_id)).toBe(String(winner.venue_id));
    expect(enrolled).not.toHaveBeenCalled();
  });

  it('is not a loss when someone pinned the same city a moment earlier — it retries as a match', async () => {
    const s = await setup();
    book.mockImplementationOnce(async () => {
      await AutoPodModel.updateOne({ _id: s.offer }, { $set: { location: pinnedTo(s.city, 'CLUB') } });
    });

    const pub: any = await venueAcceptAutoPod(String(s.owner), String(s.offer), String(s.venueId), String(s.slot));

    expect(pub.venue_claim.owner_user_id).toBe(String(s.owner));
    expect(pub.location.bound_by).toBe('CLUB');
    expect(lastEvent(pub).note).toBe('Venue accepted and picked a slot');
    expect(releaseSlot).not.toHaveBeenCalled();
  });

  it('loses when someone pinned a different city a moment earlier', async () => {
    const s = await setup();
    book.mockImplementationOnce(async () => {
      await AutoPodModel.updateOne({ _id: s.offer }, { $set: { location: pinnedTo(oid(), 'CLUB') } });
    });
    await expect(
      venueAcceptAutoPod(String(s.owner), String(s.offer), String(s.venueId), String(s.slot))
    ).rejects.toEqual(fails('CONFLICT', 'This Auto Pod has already been accepted by another venue.'));
    expect(releaseSlot).toHaveBeenCalledWith(String(s.slot), String(s.offer));
  });

  it('releases its slot when the claim write itself fails, and logs a failed release', async () => {
    const s = await setup();
    const dbError = new Error('write failed');
    const releaseError = new Error('release failed');
    const write = jest
      .spyOn(AutoPodModel, 'findOneAndUpdate')
      .mockImplementationOnce((() => Promise.reject(dbError)) as never);
    releaseSlot.mockRejectedValueOnce(releaseError);

    await expect(
      venueAcceptAutoPod(String(s.owner), String(s.offer), String(s.venueId), String(s.slot))
    ).rejects.toBe(dbError);
    await flush();
    write.mockRestore();

    expect(releaseSlot).toHaveBeenCalledWith(String(s.slot), String(s.offer));
    expect(logError).toHaveBeenCalledWith('autoPod', 'releaseAfterFailedAccept', {
      error: releaseError,
      auto_pod_id: String(s.offer),
    });
  });

  it('lets exactly one of two venues racing for the same offer win', async () => {
    const sub = oid();
    const city = await seedLocation();
    const offer = await insertAutoPod({ sub_category_id: sub });
    const contenders = await Promise.all(
      [0, 1].map(async () => {
        const owner = oid();
        const venueId = oid();
        const slot = await seedSlot({ venue_id: venueId, owner_user_id: owner });
        return { owner, venueId, slot };
      })
    );
    ownedVenue.mockImplementation(async (userId: string, id: string) => ({
      _id: new Types.ObjectId(id),
      venue_name: `Venue ${id.slice(-4)}`,
      status: 'APPROVED',
      is_active: true,
      venue_category: { sub_category_id: sub },
      location_id: city,
    }));

    const results = await Promise.allSettled(
      contenders.map((c) => venueAcceptAutoPod(String(c.owner), String(offer), String(c.venueId), String(c.slot)))
    );

    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(lost[0].reason).toEqual(fails('CONFLICT', 'This Auto Pod has already been accepted by another venue.'));
    const winner = contenders[results.findIndex((r) => r.status === 'fulfilled')];
    const stored: any = await loadRaw(offer);
    expect(String(stored.venue_claim.owner_user_id)).toBe(String(winner.owner));
    expect(releaseSlot.mock.calls.every(([slotId]) => slotId !== String(winner.slot))).toBe(true);
    expect(stored.events.filter((e: any) => e.action === 'VENUE_ENROLL')).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------- host */

describe('hostAssignAutoPod', () => {
  async function setup(offer: Record<string, unknown> = {}, minPax = 0) {
    const { subId } = await seedCategoryTree(minPax);
    const host = await seedUser({ profile: { first_name: 'Asha', last_name: 'Rao' } });
    await seedHost(host, [subId]);
    // The venue's acceptance pinned it, as it would have in the real flow.
    const venueCity = await seedLocation();
    const id = await insertAutoPod({
      sub_category_id: subId,
      stage: 'CLAIMING',
      venue_claim: venueClaim({ slot_price: 600 }),
      location: pinnedTo(venueCity, 'VENUE'),
      ...offer,
    });
    return { host: String(host), id: String(id), subId };
  }
  const meeting = {
    meeting_platform: '  Zoom ',
    meeting_url: ' https://meet.example.com/smash ',
    meeting_notes: '',
    pod_date_time: '2026-11-01T12:00:00.000Z',
    pod_end_date_time: '2026-11-01T14:00:00.000Z',
  };

  it('enrols the host with their own price and spots, after the economics check', async () => {
    const s = await setup();
    const doc: any = await loadRaw(new Types.ObjectId(s.id));

    const pub: any = await hostAssignAutoPod(s.host, s.id, null, 450, 12);

    expect(activeHost).toHaveBeenCalledWith(s.host);
    expect(viable).toHaveBeenCalledWith({
      hostUserId: s.host,
      podAmount: 450,
      noOfSpots: 12,
      venueId: String(doc.venue_claim.venue_id),
      venueAmount: 600,
    });
    expect(pub).toMatchObject({ stage: 'CLAIMING', pod_amount: 450, no_of_spots: 12, meeting_url: null });
    expect(pub.host_claim).toMatchObject({ user_id: s.host, host_name: 'Asha Rao' });
    expect(lastEvent(pub)).toMatchObject({ action: 'HOST_ENROLL', note: 'Host assigned themselves' });
    expect(enrolled.mock.calls[0][1]).toBe('host');
  });

  it('pins an unpinned virtual offer to the host city and writes the meeting they bring', async () => {
    const city = await seedLocation();
    const s = await setup({ stage: 'OPEN', pod_mode: 'VIRTUAL', venue_claim: null, location: null });

    const pub: any = await hostAssignAutoPod(s.host, s.id, String(city), 300, 5, meeting);

    expect(meetingDetails).toHaveBeenCalledWith('VIRTUAL', meeting);
    expect(futureDates).toHaveBeenCalledWith(meeting.pod_date_time, meeting.pod_end_date_time, true);
    expect(viable).toHaveBeenCalledWith(expect.objectContaining({ venueId: null, venueAmount: 0 }));
    expect(pub).toMatchObject({
      meeting_platform: 'Zoom',
      meeting_url: 'https://meet.example.com/smash',
      meeting_notes: null,
      pod_date_time: '2026-11-01T12:00:00.000Z',
      pod_end_date_time: '2026-11-01T14:00:00.000Z',
    });
    expect(pub.location).toMatchObject({ location_id: String(city), bound_by: 'HOST' });
    expect(lastEvent(pub).note).toBe('Host assigned themselves — pinned to Bengaluru, Karnataka');
  });

  it('refuses a virtual offer without a meeting, and a city the host never picked', async () => {
    const s = await setup({ stage: 'OPEN', pod_mode: 'VIRTUAL', venue_claim: null, location: null });
    await expect(hostAssignAutoPod(s.host, s.id, String(oid()), 300, 5, null)).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Set the meeting link and when the pod happens to host this virtual pod')
    );
    await expect(hostAssignAutoPod(s.host, s.id, null, 300, 5, meeting)).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Select the city you will host in first')
    );
    expect((await loadRaw(new Types.ObjectId(s.id)))?.host_claim).toBeNull();
  });

  it('matches a pinned offer: no city is fine, a different one is not', async () => {
    const city = await seedLocation();
    const s = await setup({ location: pinnedTo(city) });
    await expect(hostAssignAutoPod(s.host, s.id, String(oid()), 300, 5)).rejects.toEqual(
      fails('BAD_USER_INPUT', MISMATCH('you'))
    );
    const pub: any = await hostAssignAutoPod(s.host, s.id, undefined, 300, 5);
    expect(pub.host_claim.user_id).toBe(s.host);
    expect(lastEvent(pub).note).toBe('Host assigned themselves');
  });

  it('keeps a price between 1 and 1999 and spots inside the activity and space limits', async () => {
    const s = await setup({}, 4);
    await expect(hostAssignAutoPod(s.host, s.id, null, 0, 5)).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Ticket price must be between 1 and 1999')
    );
    await expect(hostAssignAutoPod(s.host, s.id, null, 2000, 5)).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Ticket price must be between 1 and 1999')
    );
    // The template carries no price, so leaving it out is no price at all.
    await expect(hostAssignAutoPod(s.host, s.id)).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Ticket price must be between 1 and 1999')
    );
    await expect(hostAssignAutoPod(s.host, s.id, null, 300, 3)).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Spots must be between 4 and 999')
    );
    await expect(hostAssignAutoPod(s.host, s.id, null, 300, 1000)).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Spots must be between 4 and 999')
    );
    expect(viable).not.toHaveBeenCalled();
  });

  it('refuses out of turn, a taken offer, a host outside the category and an inactive host', async () => {
    const early = await setup({ stage: 'OPEN', venue_claim: null });
    await expect(hostAssignAutoPod(early.host, early.id, null, 300, 5)).rejects.toEqual(
      fails('CONFLICT', 'A venue has to accept this Auto Pod before a host can take it.')
    );
    const taken = await setup({ host_claim: hostClaim() });
    await expect(hostAssignAutoPod(taken.host, taken.id, null, 300, 5)).rejects.toEqual(
      fails('CONFLICT', 'Another host has already taken this Auto Pod.')
    );
    const over = await setup({ stage: 'CANCELLED' });
    await expect(hostAssignAutoPod(over.host, over.id, null, 300, 5)).rejects.toEqual(
      fails('CONFLICT', 'Another host has already taken this Auto Pod.')
    );
    const stranger = await setup();
    const outsider = String(await seedUser());
    await seedHost(new Types.ObjectId(outsider), [oid()]);
    await expect(hostAssignAutoPod(outsider, stranger.id, null, 300, 5)).rejects.toEqual(
      fails('FORBIDDEN', 'You are not an approved host in this category')
    );
    activeHost.mockRejectedValueOnce(new Error('Your host profile is not active'));
    await expect(hostAssignAutoPod(stranger.host, stranger.id, null, 300, 5)).rejects.toThrow(
      'Your host profile is not active'
    );
    expect((await loadRaw(new Types.ObjectId(stranger.id)))?.host_claim).toBeNull();
  });

  it('answers a double tap by the same host without a second write', async () => {
    const s = await setup();
    await hostAssignAutoPod(s.host, s.id, null, 300, 5);
    const again: any = await hostAssignAutoPod(s.host, s.id, null, 999, 9);
    expect(again.pod_amount).toBe(300);
    const stored: any = await loadRaw(new Types.ObjectId(s.id));
    expect(stored.events.filter((e: any) => e.action === 'HOST_ENROLL')).toHaveLength(1);
    expect(viable).toHaveBeenCalledTimes(1);
  });

  it('names an unknown user "A partner"', async () => {
    const s = await setup();
    const ghost = new Types.ObjectId();
    await seedHost(ghost, [s.subId]);
    const pub: any = await hostAssignAutoPod(String(ghost), s.id, null, 300, 5);
    expect(pub.host_claim.host_name).toBe('A partner');
  });

  it('lets exactly one of two hosts racing for the same offer win', async () => {
    const s = await setup();
    const rival = await seedUser({ profile: { first_name: 'Rival', last_name: 'Host' } });
    await seedHost(rival, [s.subId]);

    const results = await Promise.allSettled([
      hostAssignAutoPod(s.host, s.id, null, 300, 5),
      hostAssignAutoPod(String(rival), s.id, null, 400, 6),
    ]);

    const winners = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const losers = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0].reason).toEqual(fails('CONFLICT', 'Another host has already taken this Auto Pod.'));
    const stored: any = await loadRaw(new Types.ObjectId(s.id));
    expect(String(stored.host_claim.user_id)).toBe(winners[0].value.host_claim.user_id);
    expect(stored.pod_amount).toBe(winners[0].value.pod_amount);
  });
});

/* ------------------------------------------------------------------- club */

describe('clubClaimAutoPod', () => {
  async function setup(offer: Record<string, unknown> = {}, club: Record<string, unknown> = {}) {
    const sub = oid();
    const city = await seedLocation();
    const admin = oid();
    const clubId = await seedClub({ category_id: sub, location_id: city, admin_user_ids: [admin], ...club });
    const id = await insertAutoPod({
      sub_category_id: sub,
      stage: 'CLAIMING',
      pod_mode: 'VIRTUAL',
      host_claim: hostClaim(),
      ...offer,
    });
    return { actor: { id: String(admin), roles: ['CLUB_ADMIN'] }, clubId: String(clubId), id: String(id), city, sub };
  }

  it('checks membership first, then enrols the club and pins its city', async () => {
    // Physical with no venue yet: the club claim lands but does not complete it.
    const s = await setup({ pod_mode: 'PHYSICAL' });
    const pub: any = await clubClaimAutoPod(s.actor, s.id, s.clubId);

    expect(clubAdmin).toHaveBeenCalledWith(s.actor, s.clubId);
    expect(pub.club_claim).toMatchObject({ club_id: s.clubId, club_name: 'Smash Club', user_id: s.actor.id });
    expect(pub.location).toMatchObject({ location_id: String(s.city), bound_by: 'CLUB' });
    expect(lastEvent(pub)).toMatchObject({
      action: 'CLUB_ENROLL',
      note: 'Club admin claimed it for their club — pinned to Bengaluru, Karnataka',
    });
    expect(enrolled.mock.calls[0][1]).toBe('club');
    expect(createPod).not.toHaveBeenCalled();
  });

  it('refuses a non-admin before reading the offer at all', async () => {
    const s = await setup();
    clubAdmin.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(clubClaimAutoPod(s.actor, s.id, s.clubId)).rejects.toThrow('Forbidden');
    expect((await loadRaw(new Types.ObjectId(s.id)))?.club_claim).toBeNull();
  });

  it('refuses out of turn, a claimed offer and a club that cannot carry it', async () => {
    const early = await setup({ host_claim: null });
    await expect(clubClaimAutoPod(early.actor, early.id, early.clubId)).rejects.toEqual(
      fails('CONFLICT', 'A host has to take this Auto Pod before a club can claim it.')
    );
    const claimed = await setup({ club_claim: clubClaim() , location: pinnedTo(oid()) });
    await expect(clubClaimAutoPod(claimed.actor, claimed.id, claimed.clubId)).rejects.toEqual(
      fails('CONFLICT', 'Another club has already claimed this Auto Pod.')
    );
    const inactive = await setup({}, { is_active: false });
    await expect(clubClaimAutoPod(inactive.actor, inactive.id, inactive.clubId)).rejects.toEqual(
      fails('BAD_USER_INPUT', 'That club is not active')
    );
    await expect(clubClaimAutoPod(inactive.actor, inactive.id, String(oid()))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'That club is not active')
    );
    const wrongCategory = await setup({}, { category_id: oid() });
    await expect(clubClaimAutoPod(wrongCategory.actor, wrongCategory.id, wrongCategory.clubId)).rejects.toEqual(
      fails('BAD_USER_INPUT', "This Auto Pod's category does not match that club")
    );
    const cityless = await setup({}, { location_id: null });
    await expect(clubClaimAutoPod(cityless.actor, cityless.id, cityless.clubId)).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Set a location on this club before claiming an Auto Pod')
    );
    const elsewhere = await setup({ location: pinnedTo(oid(), 'HOST') });
    await expect(clubClaimAutoPod(elsewhere.actor, elsewhere.id, elsewhere.clubId)).rejects.toEqual(
      fails('BAD_USER_INPUT', MISMATCH('the club'))
    );
  });

  it('answers a re-tap for the same club without a second claim', async () => {
    const s = await setup({ pod_mode: 'PHYSICAL' });
    await clubClaimAutoPod(s.actor, s.id, s.clubId);
    const again: any = await clubClaimAutoPod(s.actor, s.id, s.clubId);
    expect(again.club_claim.club_id).toBe(s.clubId);
    const stored: any = await loadRaw(new Types.ObjectId(s.id));
    expect(stored.events.filter((e: any) => e.action === 'CLUB_ENROLL')).toHaveLength(1);
  });

  it('lets exactly one of two clubs racing for the same offer win', async () => {
    const s = await setup({ pod_mode: 'PHYSICAL' });
    const rivalAdmin = oid();
    const rivalClub = await seedClub({ category_id: s.sub, location_id: s.city, admin_user_ids: [rivalAdmin] });

    const results = await Promise.allSettled([
      clubClaimAutoPod(s.actor, s.id, s.clubId),
      clubClaimAutoPod({ id: String(rivalAdmin), roles: [] }, s.id, String(rivalClub)),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const lost = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(lost.reason).toEqual(fails('CONFLICT', 'Another club has already claimed this Auto Pod.'));
    const stored: any = await loadRaw(new Types.ObjectId(s.id));
    expect([s.clubId, String(rivalClub)]).toContain(String(stored.club_claim.club_id));
    expect(stored.events.filter((e: any) => e.action === 'CLUB_ENROLL')).toHaveLength(1);
  });
});
