/**
 * The admin's side of an Auto Pod against a real Mongo: opening one (as an
 * admin or for a club), editing it, pausing it, cancelling and deleting it —
 * and the conditional writes that keep each of those safe against a partner's
 * claim landing at the same moment. Notifications, product checks, Pod
 * Settings, Account Health and the venue-slot service are faked.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('../../autoPod.notify', () => ({
  autoPodNotify: { opened: jest.fn(), cancelled: jest.fn() },
}));
jest.mock('../../autoPod.claims', () => ({ materializeAutoPod: jest.fn() }));
jest.mock('@modules/pods/pod/pod.service', () => ({
  buildProductRequests: jest.fn(),
  validateHasImage: jest.fn(),
}));
jest.mock('@modules/finance/finance/breakdown.service', () => ({
  breakdownService: { potentialPodEarnings: jest.fn() },
  venueSlotProjections: jest.fn(),
}));
jest.mock('@modules/venues/venueSlot/venueSlot.service', () => ({
  ensureOwnedVenue: jest.fn(),
  venueSlotService: { releaseForAutoPod: jest.fn(), listAvailable: jest.fn() },
}));
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getAppSettings: jest.fn() },
}));
jest.mock('@modules/access/accountHealth/accountHealth.service', () => ({
  accountHealthService: { applySystemPenalty: jest.fn() },
}));

import { logs } from '@observability/log';
import { autoPodNotify } from '../../autoPod.notify';
import { materializeAutoPod } from '../../autoPod.claims';
import { buildProductRequests, validateHasImage } from '@modules/pods/pod/pod.service';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { accountHealthService } from '@modules/access/accountHealth/accountHealth.service';
import { AutoPodModel } from '../../autoPod.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { autoPodService, categoryPathOf, resolveCategoryPair, spotLimits } from '../../autoPod.service';
import {
  clubClaim,
  HOUR_MS,
  hostClaim,
  IMAGE,
  insertAutoPod,
  loadRaw,
  oid,
  seedCategoryTree,
  seedClub,
  seedLocation,
  seedSlot,
  venueClaim,
} from './autoPod.fixtures';

const opened = autoPodNotify.opened as jest.Mock;
const cancelledNotify = autoPodNotify.cancelled as jest.Mock;
const materialize = materializeAutoPod as jest.Mock;
const buildProducts = buildProductRequests as jest.Mock;
const hasImage = validateHasImage as jest.Mock;
const release = venueSlotService.releaseForAutoPod as jest.Mock;
const appSettings = settingsService.getAppSettings as jest.Mock;
const penalty = accountHealthService.applySystemPenalty as jest.Mock;
const logError = logs.server.error as jest.Mock;
const logInfo = logs.server.info as jest.Mock;

const ADMIN = String(new Types.ObjectId('65d000000000000000000001'));
const fails = (code: string, message: string | RegExp) =>
  expect.objectContaining({
    message: typeof message === 'string' ? message : expect.stringMatching(message),
    extensions: expect.objectContaining({ code }),
  });
/** The first argument of a mock's nth call — a Mongoose document, read by path. */
const argOf = (mock: jest.Mock, call = 0): any => mock.mock.calls[call][0];
const flush = () => new Promise((resolve) => setImmediate(resolve));
const lastEvent = (doc: any) => doc.events[doc.events.length - 1];

const SETTINGS = {
  auto_pod_slot_window_days: 7,
  auto_pod_venue_expiry_hours: 24,
  auto_pod_assignment_expiry_hours: 72,
  auto_pod_cancel_health_penalty: 5,
};

beforeEach(() => {
  opened.mockResolvedValue(undefined);
  cancelledNotify.mockResolvedValue(undefined);
  buildProducts.mockResolvedValue([]);
  release.mockResolvedValue(undefined);
  appSettings.mockResolvedValue(SETTINGS);
  penalty.mockResolvedValue(undefined);
});

const template = (subId: Types.ObjectId | string, over: Record<string, unknown> = {}) => ({
  pod_title: '  Sunday Smash  ',
  pod_description: 'A friendly doubles evening',
  pod_images_and_videos: [IMAGE],
  sub_category_id: String(subId),
  ...over,
});

describe('resolveCategoryPair', () => {
  it('walks SUB → CATEGORY → SUPER and carries the activity minimum', async () => {
    const { superId, subId } = await seedCategoryTree(4);
    await expect(resolveCategoryPair(String(subId))).resolves.toEqual({
      superCategoryId: String(superId),
      subName: 'Badminton',
      minPax: 4,
    });
  });

  it('refuses an invalid id, a non-SUB node and a SUB with no super above it', async () => {
    const { midId } = await seedCategoryTree();
    const orphanSub = oid();
    await CategoryModel.collection.insertOne({ _id: orphanSub, name: 'Loose', level: 'SUB', parent_id: null });

    await expect(resolveCategoryPair('nope')).rejects.toEqual(fails('BAD_USER_INPUT', 'Select a category'));
    await expect(resolveCategoryPair(String(midId))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Select a valid sub-category')
    );
    await expect(resolveCategoryPair(String(oid()))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Select a valid sub-category')
    );
    await expect(resolveCategoryPair(String(orphanSub))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'This sub-category is not linked to a super category')
    );
  });
});

describe('autoPodService.create — by an admin', () => {
  it('opens a physical offer with no price, the category pair fixed and venues told', async () => {
    const { superId, subId } = await seedCategoryTree();
    const productA = String(oid());
    const pub: any = await autoPodService.create(
      ADMIN,
      template(subId, {
        pod_amount: 900,
        product_requests: [
          { product_id: productA, quantity: 2 },
          { product_id: '', quantity: 3 },
          { product_id: String(oid()), quantity: 0 },
        ],
      })
    );

    expect(pub).toMatchObject({
      stage: 'OPEN',
      is_active: true,
      pod_title: 'Sunday Smash',
      pod_mode: 'PHYSICAL',
      super_category_id: String(superId),
      sub_category_id: String(subId),
      pod_amount: 0,
      no_of_spots: 0,
      products_enabled: true,
      product_requests: [{ product_id: productA, quantity: 2 }],
      club_claim: null,
      location: null,
    });
    expect(pub.auto_pod_no).toMatch(/^APOD/);
    expect(pub.events).toEqual([
      expect.objectContaining({
        action: 'CREATE',
        actor_user_id: ADMIN,
        note: 'Auto Pod opened for venues, hosts and club admins',
      }),
    ]);
    expect(buildProducts).toHaveBeenCalledWith(true, [{ product_id: productA, quantity: 2 }], {
      super_category_id: String(superId),
      sub_category_id: String(subId),
    });
    expect(hasImage).toHaveBeenCalledWith([IMAGE]);
    const stored: any = await AutoPodModel.findById(pub.id).lean();
    expect(stored.venue_window_from).toBeInstanceOf(Date);
    expect(String(stored.created_by)).toBe(ADMIN);
    expect(opened).toHaveBeenCalledTimes(1);
    expect(String(argOf(opened)._id)).toBe(pub.id);
  });

  it('opens a virtual offer for hosts and club admins, without a products check', async () => {
    const { subId } = await seedCategoryTree();
    const pub: any = await autoPodService.create(ADMIN, template(subId, { pod_mode: 'VIRTUAL' }));
    expect(pub.pod_mode).toBe('VIRTUAL');
    expect(pub.products_enabled).toBe(false);
    expect(pub.events[0].note).toBe('Virtual Auto Pod opened for hosts and club admins');
    expect(buildProducts).not.toHaveBeenCalled();
  });

  it('refuses products on a virtual offer, and a bad title or description', async () => {
    const { subId } = await seedCategoryTree();
    await expect(
      autoPodService.create(
        ADMIN,
        template(subId, { pod_mode: 'VIRTUAL', product_requests: [{ product_id: String(oid()), quantity: 1 }] })
      )
    ).rejects.toEqual(fails('BAD_USER_INPUT', 'A virtual pod cannot carry products'));
    await expect(autoPodService.create(ADMIN, template(subId, { pod_title: ' ab ' }))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Title is too short')
    );
    await expect(
      autoPodService.create(ADMIN, template(subId, { pod_description: '   ' }))
    ).rejects.toEqual(fails('BAD_USER_INPUT', 'Description is required'));
    expect(await AutoPodModel.countDocuments({})).toBe(0);
  });

  it('refuses a template with no image, writing nothing', async () => {
    const { subId } = await seedCategoryTree();
    hasImage.mockImplementationOnce(() => {
      throw new Error('At least one pod image is required');
    });
    await expect(autoPodService.create(ADMIN, template(subId))).rejects.toThrow(
      'At least one pod image is required'
    );
    expect(await AutoPodModel.countDocuments({})).toBe(0);
  });

  it('still returns the new offer when the opening push fails, and logs it', async () => {
    const { subId } = await seedCategoryTree();
    const error = new Error('push down');
    opened.mockRejectedValue(error);
    const pub: any = await autoPodService.create(ADMIN, template(subId));
    await flush();
    expect(pub.stage).toBe('OPEN');
    expect(logError).toHaveBeenCalledWith('autoPod', 'notifyOpened', { error, auto_pod_id: pub.id });
  });
});

describe('autoPodService.create — by a club admin for their club', () => {
  it('enrols the club, takes its category and pins the club city', async () => {
    const { subId } = await seedCategoryTree();
    const city = await seedLocation();
    const club = await seedClub({ category_id: subId, location_id: city });

    const pub: any = await autoPodService.create(
      ADMIN,
      template(oid(), { pod_mode: 'VIRTUAL' }),
      String(club)
    );

    expect(pub.stage).toBe('CLAIMING');
    expect(pub.sub_category_id).toBe(String(subId));
    expect(pub.club_claim).toMatchObject({ club_id: String(club), club_name: 'Smash Club', user_id: ADMIN });
    expect(pub.location).toMatchObject({ location_id: String(city), city: 'Bengaluru', bound_by: 'CLUB' });
    expect(pub.events.map((e: any) => e.action)).toEqual(['CREATE', 'CLUB_ENROLL']);
    expect(pub.events[0].note).toBe(
      'Auto Pod opened — already claimed by its club, pinned to Bengaluru, Karnataka'
    );
    expect(pub.events[1]).toMatchObject({ actor_name: 'Smash Club', note: 'Opened by its club admin' });
  });

  it('refuses a club that cannot carry a pod', async () => {
    const { subId } = await seedCategoryTree();
    const city = await seedLocation();
    const inactive = await seedClub({ category_id: subId, location_id: city, is_active: false });
    const noCategory = await seedClub({ location_id: city });
    const noCity = await seedClub({ category_id: subId });
    const input = template(subId);

    await expect(autoPodService.create(ADMIN, input, 'bad')).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Invalid club_id')
    );
    await expect(autoPodService.create(ADMIN, input, String(oid()))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'That club is not active')
    );
    await expect(autoPodService.create(ADMIN, input, String(inactive))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'That club is not active')
    );
    await expect(autoPodService.create(ADMIN, input, String(noCategory))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Set a category on this club before opening an Auto Pod')
    );
    await expect(autoPodService.create(ADMIN, input, String(noCity))).rejects.toEqual(
      fails('BAD_USER_INPUT', 'Set a location on this club before opening an Auto Pod')
    );
    expect(await AutoPodModel.countDocuments({})).toBe(0);
  });
});

describe('autoPodService.update', () => {
  it('rewrites only the template fields — never the host price or spots', async () => {
    const { superId, subId } = await seedCategoryTree();
    const id = await insertAutoPod({ super_category_id: superId, sub_category_id: subId });

    const pub: any = await autoPodService.update(ADMIN, String(id), {
      pod_title: 'Monday Smash',
      pod_info: 'Bring a racket',
      pod_amount: 1500,
      no_of_spots: 40,
      product_requests: [],
    });

    expect(pub).toMatchObject({ pod_title: 'Monday Smash', pod_info: 'Bring a racket', pod_amount: 0, no_of_spots: 0 });
    expect(pub.products_enabled).toBe(false);
    expect(lastEvent(pub)).toMatchObject({ action: 'UPDATE', actor_user_id: ADMIN });
    expect(materialize).not.toHaveBeenCalled();
  });

  it('moves the category pair while nobody has enrolled on it', async () => {
    const first = await seedCategoryTree();
    const second = await seedCategoryTree();
    const id = await insertAutoPod({ super_category_id: first.superId, sub_category_id: first.subId });

    const pub: any = await autoPodService.update(ADMIN, String(id), { sub_category_id: String(second.subId) });

    expect(pub.sub_category_id).toBe(String(second.subId));
    expect(pub.super_category_id).toBe(String(second.superId));
  });

  it('locks the category once a host or a club is on it', async () => {
    const first = await seedCategoryTree();
    const second = await seedCategoryTree();
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      super_category_id: first.superId,
      sub_category_id: first.subId,
      host_claim: hostClaim(),
    });

    await expect(
      autoPodService.update(ADMIN, String(id), { sub_category_id: String(second.subId) })
    ).rejects.toEqual(
      fails('BAD_REQUEST', 'A host or club has already enrolled on this category — it cannot be changed now')
    );
    // Re-sending the same category is not a change.
    const pub: any = await autoPodService.update(ADMIN, String(id), {
      sub_category_id: String(first.subId),
      pod_title: 'Renamed',
    });
    expect(pub.pod_title).toBe('Renamed');
    expect(pub.sub_category_id).toBe(String(first.subId));
  });

  it('refuses an offer that is no longer enrolling', async () => {
    const { subId } = await seedCategoryTree();
    const id = await insertAutoPod({ stage: 'LIVE', sub_category_id: subId });
    await expect(autoPodService.update(ADMIN, String(id), { pod_title: 'x y z' })).rejects.toEqual(
      fails('BAD_REQUEST', 'This Auto Pod is no longer editable')
    );
  });

  it('misses — CONFLICT — when a host lands between the read and a category move', async () => {
    const first = await seedCategoryTree();
    const second = await seedCategoryTree();
    const id = await insertAutoPod({ super_category_id: first.superId, sub_category_id: first.subId });
    // The products check is the await between the read and the write; a host
    // enrolling right then is exactly the race the conditional write guards.
    buildProducts.mockImplementationOnce(async () => {
      await AutoPodModel.updateOne({ _id: id }, { $set: { host_claim: hostClaim(), stage: 'CLAIMING' } });
    });

    await expect(
      autoPodService.update(ADMIN, String(id), {
        sub_category_id: String(second.subId),
        product_requests: [{ product_id: String(oid()), quantity: 1 }],
      })
    ).rejects.toEqual(fails('CONFLICT', /changed while you were editing/));

    const stored: any = await loadRaw(id);
    expect(String(stored.sub_category_id)).toBe(String(first.subId));
    expect(stored.host_claim).not.toBeNull();
  });

  it('takes a complete offer live once its template is fixed', async () => {
    const { superId, subId } = await seedCategoryTree();
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      super_category_id: superId,
      sub_category_id: subId,
      venue_claim: venueClaim(),
      host_claim: hostClaim(),
      club_claim: clubClaim(),
    });
    materialize.mockImplementation(async (autoPodId: string) => {
      await AutoPodModel.updateOne({ _id: autoPodId }, { $set: { stage: 'LIVE' } });
      return AutoPodModel.findById(autoPodId);
    });

    const pub: any = await autoPodService.update(ADMIN, String(id), { pod_title: 'Fixed Smash' });

    expect(materialize).toHaveBeenCalledWith(String(id), ADMIN);
    expect(pub).toMatchObject({ stage: 'LIVE', pod_title: 'Fixed Smash' });
  });

  it('saves the template but reports why a complete offer still cannot go live', async () => {
    const { superId, subId } = await seedCategoryTree();
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      super_category_id: superId,
      sub_category_id: subId,
      pod_mode: 'VIRTUAL',
      host_claim: hostClaim(),
      club_claim: clubClaim(),
    });
    materialize.mockRejectedValueOnce(new Error('Host earnings would be negative'));
    await expect(autoPodService.update(ADMIN, String(id), { pod_title: 'Saved title' })).rejects.toEqual(
      fails('BAD_REQUEST', 'Saved, but the pod could not go live yet: Host earnings would be negative')
    );
    expect((await loadRaw(id))?.pod_title).toBe('Saved title');

    materialize.mockRejectedValueOnce('not an error');
    await expect(autoPodService.update(ADMIN, String(id), { pod_title: 'Saved again' })).rejects.toEqual(
      fails('BAD_REQUEST', 'Saved, but the pod could not go live yet: the pod could not be created')
    );
  });
});

describe('autoPodService.cancel', () => {
  it('cancels a pre-live offer, frees its slot and tells everyone', async () => {
    const id = await insertAutoPod({ stage: 'CLAIMING', venue_claim: venueClaim() });

    const pub: any = await autoPodService.cancel(ADMIN, String(id), '  Venue flooded  ');

    expect(pub).toMatchObject({ stage: 'CANCELLED', cancel_reason: 'Venue flooded' });
    expect(pub.cancelled_at).not.toBeNull();
    const stored: any = await loadRaw(id);
    expect(String(stored.cancelled_by)).toBe(ADMIN);
    expect(lastEvent(stored)).toMatchObject({ action: 'CANCEL', note: 'Venue flooded' });
    expect(release).toHaveBeenCalledWith(String(id));
    expect(cancelledNotify).toHaveBeenCalledTimes(1);
    expect(argOf(cancelledNotify).stage).toBe('CANCELLED');
  });

  it('records no reason as an empty one, and logs a failed push', async () => {
    const id = await insertAutoPod();
    const error = new Error('push down');
    cancelledNotify.mockRejectedValue(error);
    const pub: any = await autoPodService.cancel(ADMIN, String(id), null);
    await flush();
    expect(pub.cancel_reason).toBeNull();
    expect(logError).toHaveBeenCalledWith('autoPod', 'notifyCancelled', { error, auto_pod_id: String(id) });
  });

  it('reports what the offer already is when the cancel loses', async () => {
    const live = await insertAutoPod({ stage: 'LIVE' });
    const cancelled = await insertAutoPod({ stage: 'CANCELLED' });
    const expired = await insertAutoPod({ stage: 'EXPIRED' });

    await expect(autoPodService.cancel(ADMIN, String(live))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod is already live — cancel the pod itself instead')
    );
    await expect(autoPodService.cancel(ADMIN, String(cancelled))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod is already cancelled')
    );
    await expect(autoPodService.cancel(ADMIN, String(expired))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod is already expired')
    );
    expect(release).not.toHaveBeenCalled();
    expect(cancelledNotify).not.toHaveBeenCalled();
  });
});

describe('autoPodService.delete', () => {
  it('cancels a pre-live offer first, then removes it for good', async () => {
    const id = await insertAutoPod({ stage: 'CLAIMING', venue_claim: venueClaim() });

    await expect(autoPodService.delete(ADMIN, String(id))).resolves.toBe(true);

    expect(await AutoPodModel.countDocuments({ _id: id })).toBe(0);
    expect(cancelledNotify).toHaveBeenCalledTimes(1);
    expect(argOf(cancelledNotify).cancel_reason).toBe('Deleted by admin');
    expect(release).toHaveBeenCalledTimes(2);
    expect(logInfo).toHaveBeenCalledWith('autoPod', 'delete', expect.objectContaining({ auto_pod_id: String(id), actor_user_id: ADMIN }));
  });

  it('removes an expired offer without cancelling it again', async () => {
    const id = await insertAutoPod({ stage: 'EXPIRED' });
    await expect(autoPodService.delete(ADMIN, String(id))).resolves.toBe(true);
    expect(cancelledNotify).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
    expect(await AutoPodModel.countDocuments({})).toBe(0);
  });

  it('refuses a live offer and one mid-materialization', async () => {
    const live = await insertAutoPod({ stage: 'LIVE' });
    const locked = await insertAutoPod({ stage: 'MATERIALIZING' });
    await expect(autoPodService.delete(ADMIN, String(live))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod is live — delete the pod itself instead')
    );
    await expect(autoPodService.delete(ADMIN, String(locked))).rejects.toEqual(
      fails('CONFLICT', /being turned into a pod/)
    );
    expect(await AutoPodModel.countDocuments({})).toBe(2);
  });

  it('reports a conflict when another admin deleted it first', async () => {
    const id = await insertAutoPod({ stage: 'EXPIRED' });
    release.mockImplementationOnce(async () => {
      await AutoPodModel.deleteOne({ _id: id });
    });
    await expect(autoPodService.delete(ADMIN, String(id))).rejects.toEqual(
      fails('CONFLICT', 'This Auto Pod changed while it was being deleted — refresh and retry')
    );
  });
});

describe('autoPodService.loadById / getById', () => {
  it('refuses a malformed id and reports a missing offer', async () => {
    await expect(autoPodService.loadById('x')).rejects.toEqual(fails('BAD_USER_INPUT', 'Invalid auto_pod_doc_id'));
    await expect(autoPodService.loadById(String(oid()))).rejects.toEqual(fails('NOT_FOUND', 'Auto Pod not found'));
  });

  it('counts the deadline down from whichever window closes first', async () => {
    const created = new Date('2026-10-01T00:00:00Z');
    const venueless = await insertAutoPod({ created_at: created, venue_window_from: new Date('2026-10-02T00:00:00Z') });
    const legacy = await insertAutoPod({ created_at: created, venue_window_from: null });
    const withVenue = await insertAutoPod({ stage: 'CLAIMING', created_at: created, venue_claim: venueClaim() });
    const virtual = await insertAutoPod({ created_at: created, pod_mode: 'VIRTUAL' });
    const live = await insertAutoPod({ stage: 'LIVE', created_at: created });

    const expires = async (id: Types.ObjectId) => ((await autoPodService.getById(String(id))) as any).expires_at;
    expect(await expires(venueless)).toBe('2026-10-03T00:00:00.000Z');
    expect(await expires(legacy)).toBe('2026-10-02T00:00:00.000Z');
    expect(await expires(withVenue)).toBe('2026-10-04T00:00:00.000Z');
    expect(await expires(virtual)).toBe('2026-10-04T00:00:00.000Z');
    expect(await expires(live)).toBeNull();
  });
});

describe('autoPodService.windows / applyWithdrawPenalty', () => {
  it('reads the Pod Settings windows and the cutoffs before which offers are off the list', async () => {
    const before = Date.now();
    const w = await autoPodService.windows();
    const after = Date.now();
    expect(w).toMatchObject({ slotWindowDays: 7, venueExpiryHours: 24, assignmentExpiryHours: 72, cancelHealthPenalty: 5 });
    expect(w.venueCutoff.getTime()).toBeGreaterThanOrEqual(before - 24 * HOUR_MS);
    expect(w.venueCutoff.getTime()).toBeLessThanOrEqual(after - 24 * HOUR_MS);
    expect(w.assignmentCutoff.getTime()).toBeGreaterThanOrEqual(before - 72 * HOUR_MS);
    expect(w.assignmentCutoff.getTime()).toBeLessThanOrEqual(after - 72 * HOUR_MS);
  });

  it('charges every subject the configured penalty and reports it', async () => {
    const points = await autoPodService.applyWithdrawPenalty(
      [
        { type: 'VENUE', id: 'venue-1' },
        { type: 'USER', id: 'user-1' },
      ],
      'Withdrew the slot'
    );
    expect(points).toBe(5);
    expect(penalty).toHaveBeenNthCalledWith(1, { subject_type: 'VENUE', subject_id: 'venue-1', points: 5, remark: 'Withdrew the slot' });
    expect(penalty).toHaveBeenNthCalledWith(2, { subject_type: 'USER', subject_id: 'user-1', points: 5, remark: 'Withdrew the slot' });
  });

  it('charges nothing when the penalty is switched off', async () => {
    appSettings.mockResolvedValue({ ...SETTINGS, auto_pod_cancel_health_penalty: 0 });
    await expect(autoPodService.applyWithdrawPenalty([{ type: 'USER', id: 'u' }], 'x')).resolves.toBe(0);
    expect(penalty).not.toHaveBeenCalled();
  });
});

describe('autoPodService.setViewerClock', () => {
  const user = new Types.ObjectId('65d000000000000000000077');

  async function windowOf(id: Types.ObjectId) {
    const doc: any = await loadRaw(id);
    return doc.viewer_windows.find((w: any) => String(w.user_id) === String(user));
  }

  it('pauses a running clock by banking the stretch, and does nothing on a second pause', async () => {
    const startedAt = new Date(Date.now() - 2 * HOUR_MS);
    const id = await insertAutoPod({ viewer_windows: [{ user_id: user, started_at: startedAt, consumed_ms: 1000 }] });

    const before = Date.now();
    await autoPodService.setViewerClock(String(id), String(user), false);
    const after = Date.now();

    const paused = await windowOf(id);
    expect(paused.started_at).toBeNull();
    expect(paused.consumed_ms).toBeGreaterThanOrEqual(1000 + before - startedAt.getTime());
    expect(paused.consumed_ms).toBeLessThanOrEqual(1000 + after - startedAt.getTime());

    await autoPodService.setViewerClock(String(id), String(user), false);
    expect((await windowOf(id)).consumed_ms).toBe(paused.consumed_ms);
  });

  it('resumes a paused clock from exactly what was left, and ignores resuming a running one', async () => {
    const id = await insertAutoPod({ viewer_windows: [{ user_id: user, started_at: null, consumed_ms: 5000 }] });
    const before = Date.now();
    await autoPodService.setViewerClock(String(id), String(user), true);

    const resumed = await windowOf(id);
    expect(resumed.consumed_ms).toBe(5000);
    expect(resumed.started_at.getTime()).toBeGreaterThanOrEqual(before);

    await autoPodService.setViewerClock(String(id), String(user), true);
    expect((await windowOf(id)).started_at.getTime()).toBe(resumed.started_at.getTime());
  });

  it('leaves the offer alone for a partner with no clock, or a malformed id', async () => {
    const other = oid();
    const id = await insertAutoPod({ viewer_windows: [{ user_id: other, started_at: null, consumed_ms: 10 }] });
    await autoPodService.setViewerClock(String(id), String(user), true);
    await autoPodService.setViewerClock(String(id), 'not-an-id', true);
    const doc: any = await loadRaw(id);
    expect(doc.viewer_windows).toHaveLength(1);
    expect(String(doc.viewer_windows[0].user_id)).toBe(String(other));
    expect(doc.viewer_windows[0]).toMatchObject({ started_at: null, consumed_ms: 10 });
  });
});

describe('autoPodService.setActive', () => {
  it('pauses quietly and resumes loudly, each with its own event', async () => {
    const id = await insertAutoPod();

    const paused: any = await autoPodService.setActive(ADMIN, String(id), false);
    expect(paused.is_active).toBe(false);
    expect(lastEvent(paused)).toMatchObject({ action: 'PAUSE', note: 'Paused — offered to nobody until resumed' });
    expect(opened).not.toHaveBeenCalled();

    const resumed: any = await autoPodService.setActive(ADMIN, String(id), true);
    expect(resumed.is_active).toBe(true);
    expect(lastEvent(resumed)).toMatchObject({ action: 'RESUME', note: 'Resumed — offered to partners again' });
    expect(opened).toHaveBeenCalledTimes(1);
    expect(argOf(opened).is_active).toBe(true);
  });

  it('writes nothing when the offer is already in that state', async () => {
    const id = await insertAutoPod();
    const pub: any = await autoPodService.setActive(ADMIN, String(id), true);
    expect(pub.is_active).toBe(true);
    expect(pub.events).toEqual([]);
  });

  it('refuses an offer that is no longer enrolling', async () => {
    const id = await insertAutoPod({ stage: 'EXPIRED' });
    await expect(autoPodService.setActive(ADMIN, String(id), false)).rejects.toEqual(
      fails('BAD_REQUEST', 'Only an Auto Pod still enrolling can be paused or resumed')
    );
  });

  it('logs a failed resume push without failing the resume', async () => {
    const id = await insertAutoPod({ is_active: false });
    const error = new Error('push down');
    opened.mockRejectedValue(error);
    await autoPodService.setActive(ADMIN, String(id), true);
    await flush();
    expect(logError).toHaveBeenCalledWith('autoPod', 'notifyResumed', { error, auto_pod_id: String(id) });
  });
});

describe('spotLimits / categoryPathOf', () => {
  it('bounds spots by the activity minimum and the booked space', async () => {
    const owner = oid();
    const venue = oid();
    const four = await seedCategoryTree(4);
    const none = await seedCategoryTree(0);
    const roomy = await seedSlot({ venue_id: venue, owner_user_id: owner, capacity: 30 });
    const tiny = await seedSlot({ venue_id: venue, owner_user_id: owner, capacity: 1 });
    const huge = await seedSlot({ venue_id: venue, owner_user_id: owner, capacity: 5000 });
    const unset = await seedSlot({ venue_id: venue, owner_user_id: owner, capacity: 0 });
    const limits = async (subId: Types.ObjectId, slotId: Types.ObjectId | null) => {
      const id = await insertAutoPod({
        sub_category_id: subId,
        venue_claim: slotId ? venueClaim({ venue_slot_id: slotId }) : null,
      });
      return spotLimits((await AutoPodModel.findById(id))!);
    };

    await expect(limits(four.subId, roomy)).resolves.toEqual({ min: 4, max: 30 });
    await expect(limits(none.subId, roomy)).resolves.toEqual({ min: 2, max: 30 });
    await expect(limits(four.subId, tiny)).resolves.toEqual({ min: 4, max: 4 });
    await expect(limits(none.subId, huge)).resolves.toEqual({ min: 2, max: 999 });
    await expect(limits(none.subId, unset)).resolves.toEqual({ min: 2, max: 999 });
    await expect(limits(none.subId, oid())).resolves.toEqual({ min: 2, max: 999 });
    await expect(limits(none.subId, null)).resolves.toEqual({ min: 2, max: 999 });
  });

  it('names the category path from the top, and nothing for an unknown id', async () => {
    const { subId } = await seedCategoryTree();
    await expect(categoryPathOf(String(subId))).resolves.toEqual(['Sports', 'Racket', 'Badminton']);
    await expect(categoryPathOf(String(oid()))).resolves.toEqual([]);
    await expect(categoryPathOf('nope')).resolves.toEqual([]);
  });
});
