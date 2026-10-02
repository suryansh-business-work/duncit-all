/**
 * The partner side of the Auto Pod service against a real Mongo: which offers
 * each role's queue holds (category, city, turn order, pause, the venue window
 * and each partner's own countdown), who may read one offer, the studio-mode
 * counts, the admin table and the money each card projects. Finance, Pod
 * Settings, the venue-slot service and the pod mapper are faked.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('../../autoPod.notify', () => ({ autoPodNotify: { opened: jest.fn() } }));
jest.mock('@modules/pods/pod/pod.service', () => ({
  buildProductRequests: jest.fn(),
  validateHasImage: jest.fn(),
  mapPodToPublic: jest.fn(),
  loadPodClubSlugMap: jest.fn(),
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

import { mapPodToPublic, loadPodClubSlugMap } from '@modules/pods/pod/pod.service';
import { breakdownService, venueSlotProjections } from '@modules/finance/finance/breakdown.service';
import { ensureOwnedVenue, venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { AutoPodModel } from '../../autoPod.model';
import { autoPodService, autoPodToPub } from '../../autoPod.service';
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
  seedSlot,
  seedVenue,
  venueClaim,
} from './autoPod.fixtures';

const earnings = breakdownService.potentialPodEarnings as jest.Mock;
const projections = venueSlotProjections as jest.Mock;
const ownedVenue = ensureOwnedVenue as jest.Mock;
const listAvailable = venueSlotService.listAvailable as jest.Mock;
const appSettings = settingsService.getAppSettings as jest.Mock;
const mapPod = mapPodToPublic as jest.Mock;
const slugMap = loadPodClubSlugMap as jest.Mock;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** The viewer-clock stamp is fire-and-forget; wait (bounded) until it landed. */
async function waitForStamp(id: Types.ObjectId) {
  for (let i = 0; i < 40; i += 1) {
    const doc: any = await AutoPodModel.findById(id).lean();
    if (doc?.viewer_windows?.length) return;
    await sleep(50);
  }
}
const ids = (rows: readonly { id: string }[]) => rows.map((r) => r.id).sort();
const asIds = (...list: Types.ObjectId[]) => list.map(String).sort();
const fails = (code: string, message: string) =>
  expect.objectContaining({ message, extensions: expect.objectContaining({ code }) });

const SETTINGS = {
  auto_pod_slot_window_days: 7,
  auto_pod_venue_expiry_hours: 24,
  auto_pod_assignment_expiry_hours: 72,
  auto_pod_cancel_health_penalty: 5,
};

const waterfall = (over: Record<string, number> = {}) => ({
  waterfall: {
    amount: 5000,
    gst_amount: 250,
    platform_fee_amount: 500,
    venue_amount: 1000,
    club_admin_amount: 300,
    host_receives: 2950,
    ...over,
  },
});

beforeEach(() => {
  appSettings.mockResolvedValue(SETTINGS);
});

const load = async (id: Types.ObjectId) => (await AutoPodModel.findById(id))!;

describe('autoPodToPub', () => {
  it('is null for no document', () => {
    expect(autoPodToPub(null)).toBeNull();
  });

  it('flattens every claim, the pin and the trail to strings and ISO instants', async () => {
    const venue = venueClaim({ pod_end_date_time: null });
    const host = hostClaim();
    const club = clubClaim();
    const city = oid();
    const actor = oid();
    const id = await insertAutoPod({
      stage: 'CLAIMING',
      venue_claim: venue,
      host_claim: host,
      club_claim: club,
      location: pinnedTo(city, 'HOST'),
      place_charges: [{ label: 'Court', amount: 200, note: null }],
      product_requests: [{ product_id: oid(), quantity: 3 }],
      events: [
        { action: 'CREATE', actor_user_id: null, actor_name: '', note: '', at: new Date('2026-10-01T00:00:00Z') },
        { action: 'HOST_ENROLL', actor_user_id: actor, actor_name: 'Asha', note: 'n', at: new Date('2026-10-02T00:00:00Z') },
      ],
    });

    const pub: any = autoPodToPub(await load(id));

    expect(pub.venue_claim).toEqual({
      venue_id: String(venue.venue_id),
      venue_slot_id: String(venue.venue_slot_id),
      owner_user_id: String(venue.owner_user_id),
      venue_name: 'Play Arena',
      pod_date_time: venue.pod_date_time.toISOString(),
      pod_end_date_time: null,
      slot_price: 500,
      accepted_at: venue.accepted_at.toISOString(),
    });
    expect(pub.host_claim).toEqual({
      user_id: String(host.user_id),
      host_name: 'Asha Host',
      assigned_at: host.assigned_at.toISOString(),
    });
    expect(pub.club_claim).toMatchObject({ club_id: String(club.club_id), user_id: String(club.user_id) });
    expect(pub.location).toMatchObject({ location_id: String(city), bound_by: 'HOST', bound_at: '2026-09-01T00:00:00.000Z' });
    expect(pub.place_charges).toEqual([{ label: 'Court', amount: 200, note: null }]);
    expect(pub.product_requests).toHaveLength(1);
    expect(pub.events).toEqual([
      { action: 'CREATE', actor_user_id: null, actor_name: '', note: '', at: '2026-10-01T00:00:00.000Z' },
      { action: 'HOST_ENROLL', actor_user_id: String(actor), actor_name: 'Asha', note: 'n', at: '2026-10-02T00:00:00.000Z' },
    ]);
    expect(pub.cancel_reason).toBeNull();
    expect(pub.pod_id).toBeNull();
  });
});

describe('autoPodService.table', () => {
  it('lifts the "pending" filter out as a base clause and keeps the allowlisted ones', async () => {
    const venueless = await insertAutoPod();
    const needsHost = await insertAutoPod({ stage: 'CLAIMING', venue_claim: venueClaim() });
    const virtual = await insertAutoPod({ pod_mode: 'VIRTUAL' });

    const all = await autoPodService.table(null);
    expect(all.total).toBe(3);
    expect(all.page).toBe(1);
    expect(all.rows.every((row: any) => typeof row.expires_at === 'string')).toBe(true);

    const waitingOnVenue = await autoPodService.table({
      filters: [{ field: 'pending', op: 'in', values: ['VENUE'] }],
    });
    expect(ids(waitingOnVenue.rows as any)).toEqual(asIds(venueless));

    const hostAndClaiming = await autoPodService.table({
      filters: [
        { field: 'pending', op: 'eq', value: 'HOST' },
        { field: 'stage', op: 'eq', value: 'CLAIMING' },
      ],
    });
    expect(ids(hostAndClaiming.rows as any)).toEqual(asIds(needsHost));

    const nothingReal = await autoPodService.table({ filters: [{ field: 'pending', op: 'eq', value: null }] });
    expect(ids(nothingReal.rows as any)).toEqual(asIds(venueless, needsHost, virtual));
  });
});

describe('the money each card projects', () => {
  it('expectedVenueEarnings: ticket price × the booked space, once both exist', async () => {
    const owner = oid();
    const venue = oid();
    const slot = await seedSlot({ venue_id: venue, owner_user_id: owner, capacity: 12 });
    const emptySlot = await seedSlot({ venue_id: venue, owner_user_id: owner, capacity: 0 });

    const priced = await load(await insertAutoPod({ pod_amount: 300, venue_claim: venueClaim({ venue_slot_id: slot }) }));
    const unpriced = await load(await insertAutoPod({ venue_claim: venueClaim({ venue_slot_id: slot }) }));
    const noCapacity = await load(
      await insertAutoPod({ pod_amount: 300, venue_claim: venueClaim({ venue_slot_id: emptySlot }) })
    );
    const noVenue = await load(await insertAutoPod({ pod_amount: 300 }));

    await expect(autoPodService.expectedVenueEarnings(priced)).resolves.toBe(3600);
    await expect(autoPodService.expectedVenueEarnings(unpriced)).resolves.toBeNull();
    await expect(autoPodService.expectedVenueEarnings(noCapacity)).resolves.toBeNull();
    await expect(autoPodService.expectedVenueEarnings(noVenue)).resolves.toBeNull();
  });

  it("expectedClubEarnings: the club admin's cut of the host's priced pod", async () => {
    const host = oid();
    const claim = venueClaim({ slot_price: 800 });
    const doc = await load(
      await insertAutoPod({ pod_amount: 500, no_of_spots: 10, venue_claim: claim, host_claim: hostClaim(host) })
    );
    earnings.mockResolvedValue(waterfall({ club_admin_amount: 420 }));

    await expect(autoPodService.expectedClubEarnings(doc)).resolves.toBe(420);
    expect(earnings).toHaveBeenCalledWith(String(host), 500, 10, String(claim.venue_id), 800);

    earnings.mockRejectedValue(new Error('not viable'));
    await expect(autoPodService.expectedClubEarnings(doc)).resolves.toBeNull();

    const noHost = await load(await insertAutoPod({ pod_amount: 500, no_of_spots: 10 }));
    const unpriced = await load(await insertAutoPod({ host_claim: hostClaim(), no_of_spots: 10 }));
    const noSpots = await load(await insertAutoPod({ host_claim: hostClaim(), pod_amount: 500 }));
    earnings.mockClear();
    await expect(autoPodService.expectedClubEarnings(noHost)).resolves.toBeNull();
    await expect(autoPodService.expectedClubEarnings(unpriced)).resolves.toBeNull();
    await expect(autoPodService.expectedClubEarnings(noSpots)).resolves.toBeNull();
    expect(earnings).not.toHaveBeenCalled();
  });

  it('expectedClubEarnings on a virtual offer reads no venue cost', async () => {
    const host = oid();
    const doc = await load(
      await insertAutoPod({ pod_mode: 'VIRTUAL', pod_amount: 400, no_of_spots: 6, host_claim: hostClaim(host) })
    );
    earnings.mockResolvedValue(waterfall({ club_admin_amount: 90 }));
    await expect(autoPodService.expectedClubEarnings(doc)).resolves.toBe(90);
    expect(earnings).toHaveBeenCalledWith(String(host), 400, 6, null, 0);
  });

  it('expectedHostEarnings: only for a priced offer whose venue cost is known', async () => {
    const caller = String(oid());
    const claim = venueClaim({ slot_price: 700 });
    const physical = await load(await insertAutoPod({ pod_amount: 600, no_of_spots: 8, venue_claim: claim }));
    const virtual = await load(await insertAutoPod({ pod_mode: 'VIRTUAL', pod_amount: 600, no_of_spots: 8 }));
    const noVenue = await load(await insertAutoPod({ pod_amount: 600, no_of_spots: 8 }));
    const unpriced = await load(await insertAutoPod({ pod_mode: 'VIRTUAL' }));
    earnings.mockResolvedValue(waterfall({ host_receives: 1234 }));

    await expect(autoPodService.expectedHostEarnings(physical, caller)).resolves.toBe(1234);
    expect(earnings).toHaveBeenLastCalledWith(caller, 600, 8, String(claim.venue_id), 700);
    await expect(autoPodService.expectedHostEarnings(virtual, caller)).resolves.toBe(1234);
    expect(earnings).toHaveBeenLastCalledWith(caller, 600, 8, null, 0);
    expect(earnings).toHaveBeenCalledTimes(2);

    await expect(autoPodService.expectedHostEarnings(physical, null)).resolves.toBeNull();
    await expect(autoPodService.expectedHostEarnings(noVenue, caller)).resolves.toBeNull();
    await expect(autoPodService.expectedHostEarnings(unpriced, caller)).resolves.toBeNull();
    expect(earnings).toHaveBeenCalledTimes(2);

    earnings.mockRejectedValue(new Error('not viable'));
    await expect(autoPodService.expectedHostEarnings(virtual, caller)).resolves.toBeNull();
  });

  it('hostProjection: the waterfall plus the spot limits, and whether it is viable', async () => {
    const owner = oid();
    const { subId } = await seedCategoryTree();
    const slot = await seedSlot({ venue_id: oid(), owner_user_id: owner, capacity: 10 });
    const claim = venueClaim({ venue_slot_id: slot, slot_price: 900 });
    const id = await insertAutoPod({ sub_category_id: subId, venue_claim: claim });
    const host = String(oid());
    earnings.mockResolvedValue(waterfall());

    await expect(autoPodService.hostProjection(host, String(id), 500, 8)).resolves.toEqual({
      min_spots: 2,
      max_spots: 10,
      pod_amount: 500,
      no_of_spots: 8,
      total_collection: 5000,
      gst_amount: 250,
      platform_fee_amount: 500,
      venue_amount: 1000,
      club_admin_amount: 300,
      host_receives: 2950,
      viable: true,
    });
    expect(earnings).toHaveBeenCalledWith(host, 500, 8, String(claim.venue_id), 900);

    const viable = async (amount: number, spots: number) =>
      (await autoPodService.hostProjection(host, String(id), amount, spots)).viable;
    expect(await viable(500, 11)).toBe(false);
    expect(await viable(500, 1)).toBe(false);
    expect(await viable(2000, 8)).toBe(false);
    expect(await viable(0, 8)).toBe(false);
    expect(await viable(1999, 10)).toBe(true);
    earnings.mockResolvedValue(waterfall({ host_receives: 0 }));
    expect(await viable(500, 8)).toBe(false);
  });
});

describe('autoPodService.venueSlots', () => {
  const venueId = String(new Types.ObjectId('65e000000000000000000001'));
  const owner = String(new Types.ObjectId('65e000000000000000000002'));
  const slotAt = (hours: number) => new Date(Date.now() + hours * HOUR_MS).toISOString();

  beforeEach(() => {
    ownedVenue.mockResolvedValue({ _id: venueId });
    listAvailable.mockResolvedValue([
      { id: 's1', start_at: slotAt(24), end_at: slotAt(26), whole_day: false, space_label: 'Court 1', capacity: 8, price: 600 },
      { id: 's2', start_at: slotAt(48), end_at: slotAt(50), whole_day: true, space_label: '', capacity: 0, price: 900 },
      { id: 'late', start_at: slotAt(24 * 8), end_at: slotAt(24 * 8 + 2), whole_day: false, space_label: '', capacity: 4, price: 100 },
    ]);
    projections.mockResolvedValue([
      { venue_receives: 540, venue_commission_pct: 10, host_receives: 100, viable: true },
      { venue_receives: 810, venue_commission_pct: 10, host_receives: -50, viable: false },
    ]);
  });

  it('lists the free slots inside the window, each priced as the venue is paid', async () => {
    const id = await insertAutoPod({ pod_amount: 500, no_of_spots: 10, host_claim: hostClaim() });
    const result: any = await autoPodService.venueSlots(owner, String(id), venueId);

    expect(ownedVenue).toHaveBeenCalledWith(owner, venueId);
    expect(listAvailable).toHaveBeenCalledWith(venueId);
    expect(projections).toHaveBeenCalledWith(
      expect.objectContaining({ venueId, podAmount: 500, noOfSpots: 10, slotPrices: [600, 900] })
    );
    expect(result.window_days).toBe(7);
    expect(typeof result.expires_at).toBe('string');
    expect(result.slots.map((s: any) => [s.id, s.viable, s.venue_receives])).toEqual([
      ['s1', true, 540],
      ['s2', false, 810],
    ]);
    expect(result.slots[0]).toMatchObject({ space_label: 'Court 1', capacity: 8, price: 600, whole_day: false });
  });

  it('flags no slot on an offer nobody has priced yet', async () => {
    const id = await insertAutoPod();
    const result: any = await autoPodService.venueSlots(owner, String(id), venueId);
    expect(projections).toHaveBeenCalledWith(expect.objectContaining({ hostUserId: null, podAmount: 0 }));
    expect(result.slots.every((s: any) => s.viable)).toBe(true);
  });

  it('refuses a virtual offer, a taken one and one no longer enrolling', async () => {
    const virtual = await insertAutoPod({ pod_mode: 'VIRTUAL' });
    const taken = await insertAutoPod({ stage: 'CLAIMING', venue_claim: venueClaim() });
    const live = await insertAutoPod({ stage: 'LIVE' });

    await expect(autoPodService.venueSlots(owner, String(virtual), venueId)).rejects.toEqual(
      fails('BAD_REQUEST', 'A virtual Auto Pod has no venue — it needs only a host and a club')
    );
    for (const id of [taken, live]) {
      await expect(autoPodService.venueSlots(owner, String(id), venueId)).rejects.toEqual(
        fails('CONFLICT', 'This Auto Pod has already been accepted by another venue.')
      );
    }
    expect(ownedVenue).not.toHaveBeenCalled();
  });
});

describe('who the caller is, per role', () => {
  it('ownerVenues: approved, active venues only, with their category and city', async () => {
    const owner = oid();
    const sub = oid();
    const city = oid();
    const good = await seedVenue({ owner_user_id: owner, sub_category_id: sub, location_id: city });
    await seedVenue({ owner_user_id: owner, status: 'SUBMITTED' });
    await seedVenue({ owner_user_id: owner, is_active: false });
    await seedVenue({ owner_user_id: oid() });

    const venues = await autoPodService.ownerVenues(String(owner));
    expect(venues).toHaveLength(1);
    expect(String(venues[0].id)).toBe(String(good));
    expect(String(venues[0].subCategoryId)).toBe(String(sub));
    expect(String(venues[0].locationId)).toBe(String(city));
    await expect(autoPodService.ownerVenues('nope')).resolves.toEqual([]);
  });

  it('hostSubCategoryIds: each approved sub-category once', async () => {
    const user = oid();
    const a = oid();
    const b = oid();
    await seedHost(user, [a, b]);
    await seedHost(user, [a]);
    await seedHost(user, [oid()], { status: 'SUBMITTED' });

    const subs = await autoPodService.hostSubCategoryIds(String(user));
    expect(subs.map(String).sort()).toEqual(asIds(a, b));
    await expect(autoPodService.hostSubCategoryIds('nope')).resolves.toEqual([]);
  });

  it('adminClubs: active clubs the caller administers', async () => {
    const user = oid();
    const sub = oid();
    const mine = await seedClub({ admin_user_ids: [user], category_id: sub });
    await seedClub({ admin_user_ids: [user], is_active: false });
    await seedClub({ admin_user_ids: [oid()] });

    const clubs = await autoPodService.adminClubs(String(user));
    expect(clubs).toHaveLength(1);
    expect(String(clubs[0].id)).toBe(String(mine));
    expect(String(clubs[0].categoryId)).toBe(String(sub));
    expect(clubs[0].locationId).toBeNull();
    await expect(autoPodService.adminClubs('nope')).resolves.toEqual([]);
  });

  it('the open filters are null when nothing could match', () => {
    const cutoff = new Date();
    expect(autoPodService.venueOpenFilter([{ id: oid(), subCategoryId: null, locationId: null }], cutoff)).toBeNull();
    expect(autoPodService.hostOpenFilter([])).toBeNull();
    expect(autoPodService.hostOpenFilter([oid()], { sub_category_id: String(oid()) })).toBeNull();
    expect(autoPodService.clubOpenFilter([{ id: oid(), categoryId: null, locationId: null }])).toBeNull();
  });
});

describe('autoPodService.listForVenue', () => {
  it('shows what this venue could accept plus what it accepted, each on its own clock', async () => {
    const owner = oid();
    const sub = oid();
    const city = oid();
    await seedVenue({ owner_user_id: owner, sub_category_id: sub, location_id: city });
    const windowFrom = new Date(Date.now() - HOUR_MS);

    const open = await insertAutoPod({ sub_category_id: sub, venue_window_from: windowFrom });
    const sameCity = await insertAutoPod({ sub_category_id: sub, location: pinnedTo(city, 'HOST') });
    const otherCity = await insertAutoPod({ sub_category_id: sub, location: pinnedTo(oid(), 'HOST') });
    const otherSub = await insertAutoPod();
    const paused = await insertAutoPod({ sub_category_id: sub, is_active: false });
    const virtual = await insertAutoPod({ sub_category_id: sub, pod_mode: 'VIRTUAL' });
    const windowShut = await insertAutoPod({ sub_category_id: sub, venue_window_from: new Date(Date.now() - 30 * HOUR_MS) });
    const exhausted = await insertAutoPod({
      sub_category_id: sub,
      viewer_windows: [{ user_id: owner, started_at: null, consumed_ms: 73 * HOUR_MS }],
    });
    const accepted = await insertAutoPod({
      stage: 'CLAIMING',
      sub_category_id: oid(),
      venue_claim: venueClaim({ owner_user_id: owner }),
      viewer_windows: [{ user_id: owner, started_at: null, consumed_ms: 73 * HOUR_MS }],
    });

    const rows: any[] = await autoPodService.listForVenue(String(owner));

    expect(ids(rows)).toEqual(asIds(open, sameCity, accepted));
    expect(rows.every((r) => r.withdraw_penalty_points === 5)).toBe(true);
    const openRow = rows.find((r) => r.id === String(open));
    const deadline = new Date(windowFrom.getTime() + 24 * HOUR_MS).toISOString();
    expect(openRow.venue_expires_at).toBe(deadline);
    expect(openRow.expires_at).toBe(deadline);
    const acceptedRow = rows.find((r) => r.id === String(accepted));
    expect(acceptedRow.expires_at).toBeNull();
    expect(acceptedRow.venue_expires_at).toBeNull();

    // The first sight of an offer starts this venue's clock on it — and only on it.
    await waitForStamp(open);
    await waitForStamp(sameCity);
    for (const id of [open, sameCity]) {
      const doc: any = await loadRaw(id);
      expect(doc.viewer_windows.map((w: any) => String(w.user_id))).toEqual([String(owner)]);
      expect(doc.viewer_windows[0].started_at).toBeInstanceOf(Date);
    }
    for (const id of [otherCity, otherSub, paused, virtual, windowShut]) {
      expect((await loadRaw(id))?.viewer_windows).toEqual([]);
    }
    expect((await loadRaw(exhausted))?.viewer_windows).toHaveLength(1);
  });

  it('narrows to one venue on request, and shows nothing to a non-owner', async () => {
    const owner = oid();
    const subA = oid();
    const subB = oid();
    await seedVenue({ owner_user_id: owner, sub_category_id: subA });
    const venueB = await seedVenue({ owner_user_id: owner, sub_category_id: subB });
    const forA = await insertAutoPod({ sub_category_id: subA });
    const forB = await insertAutoPod({ sub_category_id: subB });

    expect(ids(await autoPodService.listForVenue(String(owner)))).toEqual(asIds(forA, forB));
    expect(ids(await autoPodService.listForVenue(String(owner), { venue_id: String(venueB) }))).toEqual(asIds(forB));
    await expect(autoPodService.listForVenue(String(owner), { venue_id: String(oid()) })).resolves.toEqual([]);
    await expect(autoPodService.listForVenue(String(oid()))).resolves.toEqual([]);
  });

  it('narrows to one city when the page selected one', async () => {
    const owner = oid();
    const sub = oid();
    const city = oid();
    await seedVenue({ owner_user_id: owner, sub_category_id: sub, location_id: city });
    const unpinned = await insertAutoPod({ sub_category_id: sub });
    const pinned = await insertAutoPod({ sub_category_id: sub, location: pinnedTo(city) });

    const rows = await autoPodService.listForVenue(String(owner), { location_id: String(city) });
    expect(ids(rows)).toEqual(asIds(unpinned, pinned));
  });
});

describe('autoPodService.listForHost', () => {
  it('offers a host a physical offer only once a venue fixed the slot, a virtual one at once', async () => {
    const host = oid();
    const sub = oid();
    await seedHost(host, [sub]);

    await insertAutoPod({ sub_category_id: sub });
    const withVenue = await insertAutoPod({ stage: 'CLAIMING', sub_category_id: sub, venue_claim: venueClaim() });
    const virtual = await insertAutoPod({ sub_category_id: sub, pod_mode: 'VIRTUAL' });
    await insertAutoPod({ stage: 'CLAIMING', sub_category_id: sub, pod_mode: 'VIRTUAL', host_claim: hostClaim() });
    const mine = await insertAutoPod({ stage: 'LIVE', sub_category_id: oid(), host_claim: hostClaim(host) });
    await insertAutoPod({ sub_category_id: oid(), pod_mode: 'VIRTUAL' });

    const rows: any[] = await autoPodService.listForHost(String(host));
    expect(ids(rows)).toEqual(asIds(withVenue, virtual, mine));
    expect(rows.every((r) => r.withdraw_penalty_points === 5)).toBe(true);
    expect(rows.find((r) => r.id === String(mine)).expires_at).toBeNull();
  });

  it('narrows by sub-category and city, and never to a category the host is not in', async () => {
    const host = oid();
    const subA = oid();
    const subB = oid();
    const city = oid();
    await seedHost(host, [subA, subB]);
    const inA = await insertAutoPod({ sub_category_id: subA, pod_mode: 'VIRTUAL' });
    const inB = await insertAutoPod({ sub_category_id: subB, pod_mode: 'VIRTUAL', location: pinnedTo(city) });
    const inBElsewhere = await insertAutoPod({ sub_category_id: subB, pod_mode: 'VIRTUAL', location: pinnedTo(oid()) });

    expect(ids(await autoPodService.listForHost(String(host), { sub_category_id: String(subB) }))).toEqual(
      asIds(inB, inBElsewhere)
    );
    expect(ids(await autoPodService.listForHost(String(host), { location_id: String(city) }))).toEqual(asIds(inA, inB));
    await expect(
      autoPodService.listForHost(String(host), { sub_category_id: String(oid()) })
    ).resolves.toEqual([]);
    await expect(autoPodService.listForHost(String(oid()))).resolves.toEqual([]);
  });
});

describe('autoPodService.listForClubAdmin', () => {
  it("offers a club an offer once a host is on it, in the club's category and city", async () => {
    const admin = oid();
    const sub = oid();
    const city = oid();
    const club = await seedClub({ admin_user_ids: [admin], category_id: sub, location_id: city });

    const ready = await insertAutoPod({ stage: 'CLAIMING', sub_category_id: sub, pod_mode: 'VIRTUAL', host_claim: hostClaim() });
    await insertAutoPod({ sub_category_id: sub, pod_mode: 'VIRTUAL' });
    await insertAutoPod({
      stage: 'CLAIMING',
      sub_category_id: sub,
      pod_mode: 'VIRTUAL',
      host_claim: hostClaim(),
      location: pinnedTo(oid()),
    });
    const ours = await insertAutoPod({
      stage: 'CLAIMING',
      sub_category_id: sub,
      pod_mode: 'VIRTUAL',
      host_claim: hostClaim(),
      club_claim: clubClaim(club),
      viewer_windows: [{ user_id: admin, started_at: null, consumed_ms: 80 * HOUR_MS }],
    });

    const rows: any[] = await autoPodService.listForClubAdmin(String(admin));
    expect(ids(rows)).toEqual(asIds(ready, ours));
    expect(rows.find((r) => r.id === String(ours)).expires_at).toBeNull();
    expect(rows.every((r) => r.withdraw_penalty_points === 5)).toBe(true);
  });

  it('shows nothing to someone who administers no club', async () => {
    await insertAutoPod({ stage: 'CLAIMING', pod_mode: 'VIRTUAL', host_claim: hostClaim() });
    await expect(autoPodService.listForClubAdmin(String(oid()))).resolves.toEqual([]);
  });
});

describe('autoPodService.canRead', () => {
  it('lets in every enrolled partner and every admin of the claiming club', async () => {
    const venueOwner = oid();
    const host = oid();
    const claimant = oid();
    const coAdmin = oid();
    const club = await seedClub({ admin_user_ids: [claimant, coAdmin] });
    const id = String(
      await insertAutoPod({
        stage: 'CLAIMING',
        venue_claim: venueClaim({ owner_user_id: venueOwner }),
        host_claim: hostClaim(host),
        club_claim: clubClaim(club, claimant),
      })
    );

    for (const user of [venueOwner, host, claimant, coAdmin]) {
      await expect(autoPodService.canRead(String(user), id)).resolves.toBe(true);
    }
    await expect(autoPodService.canRead(String(oid()), id)).resolves.toBe(false);
  });

  it('lets in a partner the offer is still open to, through the same filters as the queues', async () => {
    const owner = oid();
    const host = oid();
    const admin = oid();
    const sub = oid();
    await seedVenue({ owner_user_id: owner, sub_category_id: sub });
    await seedHost(host, [sub]);
    await seedClub({ admin_user_ids: [admin], category_id: sub });
    const forVenue = String(await insertAutoPod({ sub_category_id: sub }));
    const forClub = String(
      await insertAutoPod({ stage: 'CLAIMING', sub_category_id: sub, pod_mode: 'VIRTUAL', host_claim: hostClaim() })
    );

    await expect(autoPodService.canRead(String(owner), forVenue)).resolves.toBe(true);
    await expect(autoPodService.canRead(String(host), forVenue)).resolves.toBe(false);
    await expect(autoPodService.canRead(String(admin), forClub)).resolves.toBe(true);
    await expect(autoPodService.canRead(String(owner), forClub)).resolves.toBe(false);
  });

  it('is false for malformed ids and a missing offer', async () => {
    await expect(autoPodService.canRead('nope', String(oid()))).resolves.toBe(false);
    await expect(autoPodService.canRead(String(oid()), 'nope')).resolves.toBe(false);
    await expect(autoPodService.canRead(String(oid()), String(oid()))).resolves.toBe(false);
  });
});

describe('autoPodService.actionCounts', () => {
  it("counts what waits on the caller in each role, scoped as each queue is", async () => {
    const user = oid();
    const sub = oid();
    await seedVenue({ owner_user_id: user, sub_category_id: sub });
    await seedHost(user, [sub]);
    await seedClub({ admin_user_ids: [user], category_id: sub });
    await insertAutoPod({ sub_category_id: sub });
    await insertAutoPod({ stage: 'CLAIMING', sub_category_id: sub, venue_claim: venueClaim() });
    await insertAutoPod({ stage: 'CLAIMING', sub_category_id: sub, pod_mode: 'VIRTUAL', host_claim: hostClaim() });
    await insertAutoPod({ sub_category_id: sub, is_active: false });

    await expect(autoPodService.actionCounts(String(user))).resolves.toEqual({ venue: 1, host: 1, club: 1 });
    await expect(autoPodService.actionCounts(String(oid()))).resolves.toEqual({ venue: 0, host: 0, club: 0 });
  });
});

describe('autoPodService.materializedPod', () => {
  it('maps the live pod, and is null with no pod or a missing one', async () => {
    const podId = oid();
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
    });
    const slugs = new Map([['k', 'smash-club']]);
    slugMap.mockResolvedValue(slugs);
    mapPod.mockReturnValue({ id: String(podId), pod_title: 'Sunday Smash' });

    const live = await load(await insertAutoPod({ stage: 'LIVE', pod_id: podId }));
    await expect(autoPodService.materializedPod(live)).resolves.toEqual({ id: String(podId), pod_title: 'Sunday Smash' });
    expect(String(mapPod.mock.calls[0][0]._id)).toBe(String(podId));
    expect(mapPod.mock.calls[0][1]).toBe(slugs);

    const gone = await load(await insertAutoPod({ stage: 'LIVE', pod_id: oid() }));
    await expect(autoPodService.materializedPod(gone)).resolves.toBeNull();
    await expect(autoPodService.materializedPod(await load(await insertAutoPod()))).resolves.toBeNull();
  });
});
