/**
 * The Auto Pod sweep against a real Mongo: which offers each rule expires,
 * recovers, retries or pins — and, as importantly, which it leaves alone. The
 * venue-slot service, the notifications, the Pod Settings windows and the
 * materializer are faked; the queries and the conditional writes are real.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('../../autoPod.notify', () => ({
  autoPodNotify: {
    expired: jest.fn(),
    released: jest.fn(),
  },
}));
jest.mock('../../autoPod.service', () => ({ autoPodService: { windows: jest.fn() } }));
jest.mock('../../autoPod.claims', () => ({ materializeAutoPod: jest.fn() }));
jest.mock('@modules/venues/venueSlot/venueSlot.service', () => ({
  venueSlotService: { releaseForAutoPod: jest.fn(), transferAutoPodHold: jest.fn() },
}));

import { autoPodNotify } from '../../autoPod.notify';
import { autoPodService } from '../../autoPod.service';
import { materializeAutoPod } from '../../autoPod.claims';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { logs } from '@observability/log';
import { PodModel } from '@modules/pods/pod/pod.model';
import { runAutoPodSweep, startAutoPodSweepScheduler } from '../../autoPod.recovery';
import {
  clubClaim,
  HOUR_MS,
  hostClaim,
  insertAutoPod,
  loadRaw,
  oid,
  seedClub,
  seedLocation,
  venueClaim,
} from './autoPod.fixtures';

const windows = autoPodService.windows as jest.Mock;
const expiredNotify = autoPodNotify.expired as jest.Mock;
const releasedNotify = autoPodNotify.released as jest.Mock;
const materialize = materializeAutoPod as jest.Mock;
const release = venueSlotService.releaseForAutoPod as jest.Mock;
const transfer = venueSlotService.transferAutoPodHold as jest.Mock;
const logError = logs.server.error as jest.Mock;
const logWarn = logs.server.warn as jest.Mock;

const ago = (hours: number) => new Date(Date.now() - hours * HOUR_MS);
const ahead = (hours: number) => new Date(Date.now() + hours * HOUR_MS);
const flush = () => new Promise((resolve) => setImmediate(resolve));
const lastEvent = (doc: any) => doc.events[doc.events.length - 1];

const NOTHING = { expired: 0, recovered: 0, retried: 0, pinned: 0 };

beforeEach(() => {
  windows.mockImplementation(async () => ({
    venueExpiryHours: 24,
    venueCutoff: ago(24),
    assignmentExpiryHours: 72,
    assignmentCutoff: ago(72),
  }));
  expiredNotify.mockResolvedValue(undefined);
  releasedNotify.mockResolvedValue(undefined);
  release.mockResolvedValue(undefined);
  transfer.mockResolvedValue(undefined);
});

async function insertPodFor(autoPodId: Types.ObjectId) {
  const _id = oid();
  await PodModel.collection.insertOne({
    _id,
    pod_id: `auto-${String(_id)}`,
    pod_title: 'Sunday Smash',
    pod_hosts_id: [oid()],
    club_id: oid(),
    pod_description: 'desc',
    pod_date_time: ahead(48),
    pod_type: 'PAID',
    deleted_at: null,
    source_auto_pod_id: autoPodId,
  });
  return _id;
}

describe('runAutoPodSweep — nothing to do', () => {
  it('leaves fresh offers alone and never loads the materializer', async () => {
    const open = await insertAutoPod();
    const claiming = await insertAutoPod({ stage: 'CLAIMING', venue_claim: venueClaim() });

    await expect(runAutoPodSweep()).resolves.toEqual(NOTHING);

    expect((await loadRaw(open))?.stage).toBe('OPEN');
    expect((await loadRaw(claiming))?.stage).toBe('CLAIMING');
    expect(materialize).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });
});

describe('runAutoPodSweep — start date passed', () => {
  it('expires a claiming offer whose slot has started, frees the slot and tells everyone', async () => {
    const physical = await insertAutoPod({
      stage: 'CLAIMING',
      venue_claim: venueClaim({ pod_date_time: ago(1) }),
    });
    const virtual = await insertAutoPod({
      stage: 'CLAIMING',
      pod_mode: 'VIRTUAL',
      pod_date_time: ago(2),
      host_claim: hostClaim(),
    });
    const future = await insertAutoPod({ stage: 'CLAIMING', venue_claim: venueClaim() });

    const result = await runAutoPodSweep();
    await flush();

    expect(result).toEqual({ ...NOTHING, expired: 2 });
    for (const id of [physical, virtual]) {
      const doc: any = await loadRaw(id);
      expect(doc.stage).toBe('EXPIRED');
      expect(lastEvent(doc)).toMatchObject({
        action: 'EXPIRED',
        actor_user_id: null,
        note: 'Start date passed before everyone enrolled',
      });
      expect(release).toHaveBeenCalledWith(String(id));
    }
    expect((await loadRaw(future))?.stage).toBe('CLAIMING');
    expect(expiredNotify).toHaveBeenCalledTimes(2);
    expect(expiredNotify.mock.calls.map(([doc]) => String(doc._id)).sort()).toEqual(
      [String(physical), String(virtual)].sort()
    );
    expect(expiredNotify.mock.calls[0][0].stage).toBe('EXPIRED');
  });

  it('logs a failed expiry notification without undoing the expiry', async () => {
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      venue_claim: venueClaim({ pod_date_time: ago(1) }),
    });
    const error = new Error('push down');
    expiredNotify.mockRejectedValue(error);

    await expect(runAutoPodSweep()).resolves.toEqual({ ...NOTHING, expired: 1 });
    await flush();

    expect((await loadRaw(id))?.stage).toBe('EXPIRED');
    expect(logError).toHaveBeenCalledWith('autoPod', 'notifyExpired', {
      error,
      auto_pod_id: String(id),
    });
  });
});

describe('runAutoPodSweep — venue window', () => {
  it('releases a physical offer no venue took inside the window, counting from venue_window_from', async () => {
    const stale = await insertAutoPod({ venue_window_from: ago(30) });
    const legacy = await insertAutoPod({ venue_window_from: null, created_at: ago(30) });
    const reopened = await insertAutoPod({ venue_window_from: ago(1), created_at: ago(30) });
    const virtual = await insertAutoPod({ pod_mode: 'VIRTUAL', venue_window_from: ago(30) });

    const result = await runAutoPodSweep();
    await flush();

    expect(result).toEqual({ ...NOTHING, expired: 2 });
    for (const id of [stale, legacy]) {
      const doc: any = await loadRaw(id);
      expect(doc.stage).toBe('EXPIRED');
      expect(lastEvent(doc).note).toBe('No venue accepted within 24 hours');
    }
    expect((await loadRaw(reopened))?.stage).toBe('OPEN');
    expect((await loadRaw(virtual))?.stage).toBe('OPEN');
    expect(releasedNotify).toHaveBeenCalledTimes(2);
    expect(releasedNotify.mock.calls.every(([doc, hours]) => doc.stage === 'EXPIRED' && hours === 24)).toBe(true);
  });
});

describe('runAutoPodSweep — assignment window', () => {
  it('releases an offer still missing roles after the window, naming what it waited on', async () => {
    const waiting = await insertAutoPod({
      stage: 'CLAIMING',
      created_at: ago(80),
      venue_window_from: ago(1),
      venue_claim: venueClaim(),
    });
    const young = await insertAutoPod({
      stage: 'CLAIMING',
      created_at: ago(10),
      venue_claim: venueClaim(),
    });

    const result = await runAutoPodSweep();
    await flush();

    expect(result).toEqual({ ...NOTHING, expired: 1 });
    const doc: any = await loadRaw(waiting);
    expect(doc.stage).toBe('EXPIRED');
    expect(lastEvent(doc).note).toBe(
      'Not fully assigned within 72 hours — still waiting on host, club'
    );
    expect(releasedNotify).toHaveBeenCalledTimes(1);
    expect(String(releasedNotify.mock.calls[0][0]._id)).toBe(String(waiting));
    expect(releasedNotify.mock.calls[0][1]).toBe(72);
    expect((await loadRaw(young))?.stage).toBe('CLAIMING');
  });

  it('never expires an offer that is already live or cancelled', async () => {
    const live = await insertAutoPod({ stage: 'LIVE', created_at: ago(200) });
    const cancelled = await insertAutoPod({ stage: 'CANCELLED', created_at: ago(200) });

    await expect(runAutoPodSweep()).resolves.toEqual(NOTHING);
    expect((await loadRaw(live))?.stage).toBe('LIVE');
    expect((await loadRaw(cancelled))?.stage).toBe('CANCELLED');
  });
});

describe('runAutoPodSweep — stuck materialization', () => {
  it('finishes the handover when the pod was created before the crash', async () => {
    const claim = venueClaim();
    const stuck = await insertAutoPod({
      stage: 'MATERIALIZING',
      updated_at: ago(1),
      venue_claim: claim,
      host_claim: hostClaim(),
      club_claim: clubClaim(),
    });
    const podId = await insertPodFor(stuck);

    await expect(runAutoPodSweep()).resolves.toEqual({ ...NOTHING, recovered: 1 });

    expect(transfer).toHaveBeenCalledWith(String(claim.venue_slot_id), String(stuck), String(podId));
    const doc: any = await loadRaw(stuck);
    expect(doc.stage).toBe('LIVE');
    expect(String(doc.pod_id)).toBe(String(podId));
    expect(doc.materialized_at).toBeInstanceOf(Date);
    expect(lastEvent(doc)).toMatchObject({ action: 'LIVE', note: 'Recovered after an interrupted create' });
  });

  it('still goes live when the slot handover fails, and a virtual one hands nothing over', async () => {
    transfer.mockRejectedValue(new Error('slot gone'));
    const physical = await insertAutoPod({
      stage: 'MATERIALIZING',
      updated_at: ago(1),
      venue_claim: venueClaim(),
    });
    const virtual = await insertAutoPod({
      stage: 'MATERIALIZING',
      pod_mode: 'VIRTUAL',
      updated_at: ago(1),
    });
    await insertPodFor(physical);
    await insertPodFor(virtual);

    await expect(runAutoPodSweep()).resolves.toEqual({ ...NOTHING, recovered: 2 });

    expect(transfer).toHaveBeenCalledTimes(1);
    expect((await loadRaw(physical))?.stage).toBe('LIVE');
    expect((await loadRaw(virtual))?.stage).toBe('LIVE');
  });

  it('returns an interrupted create with no pod to CLAIMING, and leaves a fresh lock alone', async () => {
    const orphan = await insertAutoPod({ stage: 'MATERIALIZING', updated_at: ago(1) });
    const fresh = await insertAutoPod({ stage: 'MATERIALIZING', updated_at: new Date() });

    await expect(runAutoPodSweep()).resolves.toEqual({ ...NOTHING, recovered: 1 });

    const doc: any = await loadRaw(orphan);
    expect(doc.stage).toBe('CLAIMING');
    expect(doc.pod_id).toBeNull();
    expect(lastEvent(doc)).toMatchObject({
      action: 'MATERIALIZE_FAILED',
      note: 'Interrupted — returned for retry',
    });
    expect((await loadRaw(fresh))?.stage).toBe('MATERIALIZING');
    expect(transfer).not.toHaveBeenCalled();
  });
});

describe('runAutoPodSweep — complete but not live', () => {
  const complete = (over: Record<string, unknown> = {}) =>
    insertAutoPod({
      stage: 'CLAIMING',
      updated_at: ago(1),
      venue_claim: venueClaim(),
      host_claim: hostClaim(),
      club_claim: clubClaim(),
      ...over,
    });

  it('retries each complete offer with a future start and counts the ones that went live', async () => {
    const goesLive = await complete();
    const stillFails = await complete();
    const staysClaiming = await complete();
    const virtual = await complete({ pod_mode: 'VIRTUAL', venue_claim: null, pod_date_time: ahead(5) });
    const justTouched = await complete({ updated_at: new Date() });
    const incomplete = await complete({ club_claim: null });
    const failure = new Error('price no longer covers the venue');
    materialize.mockImplementation(async (id: string) => {
      if (id === String(stillFails)) throw failure;
      if (id === String(staysClaiming)) return { stage: 'CLAIMING' };
      return { stage: 'LIVE' };
    });

    await expect(runAutoPodSweep()).resolves.toEqual({ ...NOTHING, retried: 2 });

    const tried = materialize.mock.calls.map(([id]) => id).sort();
    expect(tried).toEqual(
      [String(goesLive), String(stillFails), String(staysClaiming), String(virtual)].sort()
    );
    expect(materialize.mock.calls.every(([, actor]) => actor === null)).toBe(true);
    expect(tried).not.toContain(String(justTouched));
    expect(tried).not.toContain(String(incomplete));
    expect(logWarn).toHaveBeenCalledWith('autoPod', 'retryMaterialize', {
      error: failure,
      auto_pod_id: String(stillFails),
    });
  });
});

describe('runAutoPodSweep — legacy club pins', () => {
  it('pins a club-opened offer to its club city, and leaves one whose club has no city', async () => {
    const city = await seedLocation();
    const pinnedClub = await seedClub({ location_id: city });
    const homelessClub = await seedClub({ location_id: null });
    const legacy = await insertAutoPod({ stage: 'CLAIMING', club_claim: clubClaim(pinnedClub) });
    const unpinnable = await insertAutoPod({ stage: 'CLAIMING', club_claim: clubClaim(homelessClub) });

    await expect(runAutoPodSweep()).resolves.toEqual({ ...NOTHING, pinned: 1 });

    const doc: any = await loadRaw(legacy);
    expect(String(doc.location.location_id)).toBe(String(city));
    expect(doc.location.bound_by).toBe('CLUB');
    expect(lastEvent(doc)).toMatchObject({
      action: 'PIN',
      note: 'Pinned to Bengaluru, Karnataka from its club',
    });
    expect((await loadRaw(unpinnable))?.location).toBeNull();
  });
});

describe('startAutoPodSweepScheduler', () => {
  it('never starts a real loop under the test environment', async () => {
    const stop = startAutoPodSweepScheduler();
    expect(typeof stop).toBe('function');
    expect(stop()).toBeUndefined();
    await flush();
    expect(windows).not.toHaveBeenCalled();
  });
});
