/**
 * What happens after the enrolments, against a real Mongo: the last one taking
 * the offer live through the ordinary pod funnel (exactly once, with a failure
 * putting it back without anyone losing their place), and each partner
 * withdrawing — the offer reopened for their role, the pin dropped only when
 * they were alone on it, their clock resumed and the Account Health penalty
 * charged. The pod funnel, finance, the slot service and pushes are faked.
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
import { podService } from '@modules/pods/pod/pod.service';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { clubAdminService } from '@modules/clubs/clubAdmin/clubAdmin.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { accountHealthService } from '@modules/access/accountHealth/accountHealth.service';
import { AutoPodModel } from '../../autoPod.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import {
  clubClaimAutoPod,
  clubWithdrawAutoPod,
  hostAssignAutoPod,
  hostWithdrawAutoPod,
  materializeAutoPod,
  venueWithdrawAutoPod,
} from '../../autoPod.claims';
import {
  clubClaim,
  HOUR_MS,
  hostClaim,
  IMAGE,
  insertAutoPod,
  loadRaw,
  oid,
  pinnedTo,
  seedClub,
  seedLocation,
  venueClaim,
} from './autoPod.fixtures';

const withdrawn = autoPodNotify.withdrawn as jest.Mock;
const live = autoPodNotify.live as jest.Mock;
const enrolled = autoPodNotify.enrolled as jest.Mock;
const createPod = podService.create as jest.Mock;
const releaseSlot = venueSlotService.releaseAutoPodSlot as jest.Mock;
const clubAdmin = clubAdminService.assertClubAdmin as jest.Mock;
const appSettings = settingsService.getAppSettings as jest.Mock;
const penalty = accountHealthService.applySystemPenalty as jest.Mock;
const logError = logs.server.error as jest.Mock;

const fails = (code: string, message: string) =>
  expect.objectContaining({ message, extensions: expect.objectContaining({ code }) });
const lastEvent = (doc: any) => doc.events[doc.events.length - 1];
const flush = () => new Promise((resolve) => setImmediate(resolve));
const raw = (id: Types.ObjectId | string) => loadRaw(new Types.ObjectId(String(id)));

beforeEach(() => {
  appSettings.mockResolvedValue({
    auto_pod_slot_window_days: 7,
    auto_pod_venue_expiry_hours: 24,
    auto_pod_assignment_expiry_hours: 72,
    auto_pod_cancel_health_penalty: 5,
  });
  withdrawn.mockResolvedValue(undefined);
  live.mockResolvedValue(undefined);
  enrolled.mockResolvedValue(undefined);
  releaseSlot.mockResolvedValue(undefined);
  clubAdmin.mockResolvedValue(undefined);
  penalty.mockResolvedValue(undefined);
});

/* ------------------------------------------------------------ materialize */

describe('materializeAutoPod', () => {
  const completePhysical = (over: Record<string, unknown> = {}) =>
    insertAutoPod({
      stage: 'CLAIMING',
      pod_amount: 450,
      no_of_spots: 12,
      place_charges: [{ label: 'Court', amount: 200, note: null }],
      product_requests: [{ product_id: oid(), quantity: 2 }],
      products_enabled: true,
      venue_claim: venueClaim(),
      host_claim: hostClaim(),
      club_claim: clubClaim(),
      ...over,
    });

  it('creates the pod through the ordinary funnel, hands the slot over and goes live', async () => {
    const id = await completePhysical();
    const doc: any = await raw(id);
    const podId = String(oid());
    createPod.mockResolvedValue({ id: podId });

    const actor = String(oid());

    const result = await materializeAutoPod(String(id), actor);

    const [input, audit, opts] = createPod.mock.calls[0];
    expect(input).toMatchObject({
      pod_title: 'Sunday Smash',
      pod_type: 'PAID',
      pod_amount: 450,
      no_of_spots: 12,
      club_id: String(doc.club_claim.club_id),
      pod_hosts_id: [String(doc.host_claim.user_id)],
      pod_mode: 'PHYSICAL',
      venue_id: String(doc.venue_claim.venue_id),
      venue_slot_id: String(doc.venue_claim.venue_slot_id),
      pod_date_time: doc.venue_claim.pod_date_time.toISOString(),
      pod_end_date_time: doc.venue_claim.pod_end_date_time.toISOString(),
      pod_images_and_videos: [IMAGE],
      place_charges: [{ label: 'Court', amount: 200, note: null }],
      products_enabled: true,
      is_active: true,
    });
    expect(input.product_requests).toEqual([
      { product_id: String(doc.product_requests[0].product_id), quantity: 2 },
    ]);
    expect(audit).toEqual({ actorUserId: null, source: 'SYSTEM', note: `Materialized from Auto Pod ${doc.auto_pod_no}` });
    expect(opts).toEqual({
      autoPodSlot: { slotId: String(doc.venue_claim.venue_slot_id), autoPodId: String(id) },
    });
    expect(result.stage).toBe('LIVE');
    expect(String(result.pod_id)).toBe(podId);
    const stored: any = await raw(id);
    expect(stored.stage).toBe('LIVE');
    expect(stored.materialized_at).toBeInstanceOf(Date);
    expect(lastEvent(stored)).toMatchObject({ action: 'LIVE', note: 'Everyone enrolled — pod created' });
    expect(String(lastEvent(stored).actor_user_id)).toBe(actor);
    expect(live).toHaveBeenCalledTimes(1);
  });

  it('builds a virtual pod from its own meeting and window, with no slot to hand over', async () => {
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      pod_mode: 'VIRTUAL',
      meeting_platform: 'Zoom',
      meeting_url: 'https://meet.example.com/smash',
      meeting_notes: null,
      pod_date_time: new Date('2026-11-01T12:00:00Z'),
      pod_end_date_time: new Date('2026-11-01T14:00:00Z'),
      host_claim: hostClaim(),
      club_claim: clubClaim(),
    });
    createPod.mockResolvedValue({ id: String(oid()) });

    await materializeAutoPod(String(id), null);

    const [input, , opts] = createPod.mock.calls[0];
    expect(input).toMatchObject({
      pod_mode: 'VIRTUAL',
      venue_id: null,
      venue_slot_id: null,
      meeting_platform: 'Zoom',
      meeting_url: 'https://meet.example.com/smash',
      meeting_notes: null,
      pod_date_time: '2026-11-01T12:00:00.000Z',
      pod_end_date_time: '2026-11-01T14:00:00.000Z',
    });
    expect(opts).toEqual({ autoPodId: String(id) });
  });

  it('creates exactly one pod when two final claims race to materialize', async () => {
    const id = await completePhysical();
    createPod.mockImplementation(async () => ({ id: String(oid()) }));

    const [a, b] = await Promise.all([materializeAutoPod(String(id), null), materializeAutoPod(String(id), null)]);

    expect(createPod).toHaveBeenCalledTimes(1);
    expect([a.stage, b.stage]).toContain('LIVE');
    expect((await raw(id))?.stage).toBe('LIVE');
  });

  it('reports the current state, creating nothing, when the offer is not ready', async () => {
    const incomplete = await insertAutoPod({ stage: 'CLAIMING', host_claim: hostClaim() });
    const already = await completePhysical({ stage: 'LIVE' });
    expect((await materializeAutoPod(String(incomplete), null)).stage).toBe('CLAIMING');
    expect((await materializeAutoPod(String(already), null)).stage).toBe('LIVE');
    expect(createPod).not.toHaveBeenCalled();
  });

  it('puts a failed create back to CLAIMING with the reason, keeping every enrolment', async () => {
    const id = await completePhysical();
    const failure = new Error('Host earnings would be negative');
    createPod.mockRejectedValue(failure);

    await expect(materializeAutoPod(String(id), null)).rejects.toBe(failure);

    const stored: any = await raw(id);
    expect(stored.stage).toBe('CLAIMING');
    expect(stored.host_claim).not.toBeNull();
    expect(stored.club_claim).not.toBeNull();
    expect(stored.venue_claim).not.toBeNull();
    expect(lastEvent(stored)).toMatchObject({ action: 'MATERIALIZE_FAILED', note: 'Host earnings would be negative' });
    expect(live).not.toHaveBeenCalled();
  });

  it('treats a create that returned nothing as a failure', async () => {
    const id = await completePhysical();
    createPod.mockResolvedValue(null);
    await expect(materializeAutoPod(String(id), null)).rejects.toEqual(
      fails('INTERNAL_SERVER_ERROR', 'The pod could not be created')
    );
    expect((await raw(id))?.stage).toBe('CLAIMING');
  });

  it('records a non-Error failure in plain words', async () => {
    const id = await completePhysical();
    createPod.mockRejectedValue('boom');
    await expect(materializeAutoPod(String(id), null)).rejects.toBe('boom');
    expect(lastEvent(await raw(id)).note).toBe('Could not create the pod');
  });

  it('finishes the handover when the pod row exists although the request failed after it', async () => {
    const id = await completePhysical();
    const podId = oid();
    createPod.mockImplementation(async () => {
      await PodModel.collection.insertOne({
        _id: podId,
        pod_id: 'sunday-smash',
        pod_title: 'Sunday Smash',
        pod_hosts_id: [oid()],
        club_id: oid(),
        pod_description: 'desc',
        pod_date_time: new Date(Date.now() + 48 * HOUR_MS),
        pod_type: 'PAID',
        deleted_at: null,
        source_auto_pod_id: id,
      });
      throw new Error('handover write failed');
    });

    const result = await materializeAutoPod(String(id), null);

    expect(result.stage).toBe('LIVE');
    expect(String(result.pod_id)).toBe(String(podId));
    expect(lastEvent(await raw(id))).toMatchObject({
      action: 'LIVE',
      note: 'Pod created — handover completed after an interrupted write',
    });
    expect(logError).toHaveBeenCalledWith('autoPod', 'materializeAfterCreate', expect.objectContaining({ auto_pod_id: String(id) }));
  });

  it('logs a failed live push without undoing the pod', async () => {
    const id = await completePhysical();
    const error = new Error('push down');
    createPod.mockResolvedValue({ id: String(oid()) });
    live.mockRejectedValue(error);
    await materializeAutoPod(String(id), null);
    await flush();
    expect(logError).toHaveBeenCalledWith('autoPod', 'notifyLive', { error, auto_pod_id: String(id) });
  });

  it('is what the final club claim triggers, and what a retried host tap triggers', async () => {
    const city = await seedLocation();
    const sub = oid();
    const admin = oid();
    const club = await seedClub({ category_id: sub, location_id: city, admin_user_ids: [admin] });
    const host = oid();
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      sub_category_id: sub,
      location: pinnedTo(city),
      venue_claim: venueClaim(),
      host_claim: hostClaim(host),
    });
    createPod.mockRejectedValueOnce(new Error('pricing'));
    await expect(clubClaimAutoPod({ id: String(admin), roles: [] }, String(id), String(club))).rejects.toThrow('pricing');
    expect((await raw(id))?.club_claim).not.toBeNull();

    createPod.mockResolvedValue({ id: String(oid()) });
    const pub: any = await hostAssignAutoPod(String(host), String(id));
    expect(pub.stage).toBe('LIVE');
    expect(createPod).toHaveBeenCalledTimes(2);
  });
});

/* -------------------------------------------------------------- withdraw */

describe('venueWithdrawAutoPod', () => {
  it('reopens the offer for venues, drops its own pin, frees the slot and charges both subjects', async () => {
    const owner = oid();
    const claim = venueClaim({ owner_user_id: owner, venue_name: 'Play Arena' });
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      venue_claim: claim,
      location: pinnedTo(oid(), 'VENUE'),
      venue_window_from: new Date('2026-09-01T00:00:00Z'),
      viewer_windows: [{ user_id: owner, started_at: null, consumed_ms: 1234 }],
    });

    const pub: any = await venueWithdrawAutoPod(String(owner), String(id));

    expect(pub).toMatchObject({ stage: 'OPEN', venue_claim: null, location: null });
    const stored: any = await raw(id);
    expect(stored.venue_window_from.getTime()).toBeGreaterThan(new Date('2026-09-01T00:00:00Z').getTime());
    expect(lastEvent(stored)).toMatchObject({ action: 'VENUE_WITHDRAW', actor_name: 'Play Arena', note: 'Venue withdrew its slot' });
    expect(releaseSlot).toHaveBeenCalledWith(String(claim.venue_slot_id), String(id));
    expect(penalty).toHaveBeenCalledTimes(2);
    expect(penalty).toHaveBeenCalledWith({
      subject_type: 'VENUE',
      subject_id: String(claim.venue_id),
      points: 5,
      remark: 'Withdrew the slot from Auto Pod "Sunday Smash"',
    });
    expect(penalty).toHaveBeenCalledWith(expect.objectContaining({ subject_type: 'USER', subject_id: String(owner) }));
    expect(stored.viewer_windows[0].started_at).toBeInstanceOf(Date);
    expect(stored.viewer_windows[0].consumed_ms).toBe(1234);
    expect(withdrawn.mock.calls[0].slice(1)).toEqual(['venue', 'Play Arena']);
  });

  it('keeps the offer CLAIMING and pinned while a host is still on it', async () => {
    const owner = oid();
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      venue_claim: venueClaim({ owner_user_id: owner }),
      host_claim: hostClaim(),
      location: pinnedTo(oid(), 'VENUE'),
    });
    const pub: any = await venueWithdrawAutoPod(String(owner), String(id));
    expect(pub.stage).toBe('CLAIMING');
    expect(pub.location).not.toBeNull();
  });

  it('refuses a stranger, a finished offer and a write that lost to a concurrent change', async () => {
    const owner = oid();
    const id = await insertAutoPod({ stage: 'CLAIMING', venue_claim: venueClaim({ owner_user_id: owner }) });
    await expect(venueWithdrawAutoPod(String(oid()), String(id))).rejects.toEqual(
      fails('FORBIDDEN', 'You have not accepted this Auto Pod.')
    );
    const unclaimed = await insertAutoPod();
    await expect(venueWithdrawAutoPod(String(owner), String(unclaimed))).rejects.toEqual(
      fails('FORBIDDEN', 'You have not accepted this Auto Pod.')
    );
    const liveOne = await insertAutoPod({ stage: 'LIVE', venue_claim: venueClaim({ owner_user_id: owner }) });
    await expect(venueWithdrawAutoPod(String(owner), String(liveOne))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod is no longer enrolling.')
    );
    const write = jest.spyOn(AutoPodModel, 'findOneAndUpdate').mockResolvedValueOnce(null as never);
    await expect(venueWithdrawAutoPod(String(owner), String(id))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod changed while you were cancelling — refresh and try again')
    );
    write.mockRestore();
    expect(releaseSlot).not.toHaveBeenCalled();
    expect(penalty).not.toHaveBeenCalled();
  });

  it('logs a failed withdrawal push', async () => {
    const owner = oid();
    const id = await insertAutoPod({ stage: 'CLAIMING', venue_claim: venueClaim({ owner_user_id: owner }) });
    const error = new Error('push down');
    withdrawn.mockRejectedValue(error);
    await venueWithdrawAutoPod(String(owner), String(id));
    await flush();
    expect(logError).toHaveBeenCalledWith('autoPod', 'notifyVenueWithdrawn', { error, auto_pod_id: String(id) });
  });
});

describe('hostWithdrawAutoPod', () => {
  it("clears the host's price, spots and meeting, and drops a pin only the host made", async () => {
    const host = oid();
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      pod_mode: 'VIRTUAL',
      pod_amount: 300,
      no_of_spots: 5,
      meeting_platform: 'Zoom',
      meeting_url: 'https://meet.example.com/smash',
      meeting_notes: 'Bring a racket',
      pod_date_time: new Date('2026-11-01T12:00:00Z'),
      pod_end_date_time: new Date('2026-11-01T14:00:00Z'),
      host_claim: hostClaim(host, { host_name: 'Asha' }),
      location: pinnedTo(oid(), 'HOST'),
    });

    const pub: any = await hostWithdrawAutoPod(String(host), String(id));

    expect(pub).toMatchObject({
      stage: 'OPEN',
      host_claim: null,
      location: null,
      pod_amount: 0,
      no_of_spots: 0,
      meeting_platform: null,
      meeting_url: null,
      meeting_notes: null,
      pod_date_time: null,
      pod_end_date_time: null,
    });
    expect(lastEvent(pub)).toMatchObject({ action: 'HOST_WITHDRAW', actor_name: 'Asha', note: 'Host stepped off' });
    expect(penalty).toHaveBeenCalledTimes(1);
    expect(penalty).toHaveBeenCalledWith({
      subject_type: 'USER',
      subject_id: String(host),
      points: 5,
      remark: 'Stepped off Auto Pod "Sunday Smash"',
    });
    expect(withdrawn.mock.calls[0].slice(1)).toEqual(['host', 'Asha']);
  });

  it("keeps a venue's pin and stays CLAIMING when the venue is still on it", async () => {
    const host = oid();
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      venue_claim: venueClaim(),
      host_claim: hostClaim(host),
      location: pinnedTo(oid(), 'VENUE'),
    });
    const pub: any = await hostWithdrawAutoPod(String(host), String(id));
    expect(pub.stage).toBe('CLAIMING');
    expect(pub.location.bound_by).toBe('VENUE');
  });

  it('refuses someone who is not the host, a finished offer and a lost write', async () => {
    const host = oid();
    const id = await insertAutoPod({ stage: 'CLAIMING', host_claim: hostClaim(host) });
    await expect(hostWithdrawAutoPod(String(oid()), String(id))).rejects.toEqual(
      fails('FORBIDDEN', 'You have not taken this Auto Pod.')
    );
    const done = await insertAutoPod({ stage: 'EXPIRED', host_claim: hostClaim(host) });
    await expect(hostWithdrawAutoPod(String(host), String(done))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod is no longer enrolling.')
    );
    const write = jest.spyOn(AutoPodModel, 'findOneAndUpdate').mockResolvedValueOnce(null as never);
    await expect(hostWithdrawAutoPod(String(host), String(id))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod changed while you were cancelling — refresh and try again')
    );
    write.mockRestore();
    expect(penalty).not.toHaveBeenCalled();
  });
});

describe('clubWithdrawAutoPod', () => {
  it('lets any admin of the claiming club take the claim back, dropping a pin only the club made', async () => {
    const claimant = oid();
    const coAdmin = oid();
    const club = oid();
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      club_claim: clubClaim(club, claimant, { club_name: 'Smash Club' }),
      location: pinnedTo(oid(), 'CLUB'),
    });
    const actor = { id: String(coAdmin), roles: ['CLUB_ADMIN'] };

    const pub: any = await clubWithdrawAutoPod(actor, String(id));

    expect(clubAdmin).toHaveBeenCalledWith(actor, String(club));
    expect(pub).toMatchObject({ stage: 'OPEN', club_claim: null, location: null });
    expect(lastEvent(pub)).toMatchObject({
      action: 'CLUB_WITHDRAW',
      actor_user_id: String(coAdmin),
      actor_name: 'Smash Club',
      note: 'Club admin withdrew the claim',
    });
    expect(penalty).toHaveBeenCalledWith({
      subject_type: 'USER',
      subject_id: String(coAdmin),
      points: 5,
      remark: 'Withdrew the club claim on Auto Pod "Sunday Smash"',
    });
    expect(withdrawn.mock.calls[0].slice(1)).toEqual(['club', 'Smash Club']);
  });

  it('returns the offer to the club queue while a host is still on it', async () => {
    const admin = oid();
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      host_claim: hostClaim(),
      club_claim: clubClaim(oid(), admin),
      location: pinnedTo(oid(), 'CLUB'),
    });
    const pub: any = await clubWithdrawAutoPod({ id: String(admin), roles: [] }, String(id));
    expect(pub.stage).toBe('CLAIMING');
    expect(pub.location).not.toBeNull();
  });

  it('refuses when no club claimed it, a non-admin, a finished offer and a lost write', async () => {
    const actor = { id: String(oid()), roles: [] };
    const unclaimed = await insertAutoPod();
    await expect(clubWithdrawAutoPod(actor, String(unclaimed))).rejects.toEqual(
      fails('FORBIDDEN', 'No club has claimed this Auto Pod.')
    );
    const claimed = await insertAutoPod({ stage: 'CLAIMING', club_claim: clubClaim(), location: pinnedTo(oid(), 'CLUB') });
    clubAdmin.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(clubWithdrawAutoPod(actor, String(claimed))).rejects.toThrow('Forbidden');
    expect((await raw(claimed))?.club_claim).not.toBeNull();

    const done = await insertAutoPod({ stage: 'LIVE', club_claim: clubClaim() });
    await expect(clubWithdrawAutoPod(actor, String(done))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod is no longer enrolling.')
    );
    const write = jest.spyOn(AutoPodModel, 'findOneAndUpdate').mockResolvedValueOnce(null as never);
    await expect(clubWithdrawAutoPod(actor, String(claimed))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod changed while you were cancelling — refresh and try again')
    );
    write.mockRestore();
    expect(penalty).not.toHaveBeenCalled();
  });
});
