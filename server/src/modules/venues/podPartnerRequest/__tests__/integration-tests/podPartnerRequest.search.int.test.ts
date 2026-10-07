/**
 * "Search Nearby Hosts / Venues" against a real database: who may search, the
 * radius (default, clamp), the category filter at any level, who is left out
 * (unapproved, inactive, unplaced, the caller's own), nearest-first ordering,
 * and the open-request chip. Every Location carries its coordinates, and the
 * Maps key is blank, so nothing is ever geocoded over the network.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn().mockResolvedValue('') }));

import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { PodPartnerRequestModel } from '../../podPartnerRequest.model';
import { MAX_RADIUS_KM, DEFAULT_RADIUS_KM, pairDistanceKm, podPartnerSearch } from '../../podPartnerRequest.search';

const CITY = { lat: 19, lng: 72.8 };
// One hundredth of a degree of latitude is ~1.11 km, so these sit ~1.1 / 4.4 / 8.9 / 22.2 km north of the city.
const ZONES = [
  { zone_name: 'Near', lat: 19.01, lng: 72.8 },
  { zone_name: 'Mid', lat: 19.04, lng: 72.8 },
  { zone_name: 'Far', lat: 19.08, lng: 72.8 },
  { zone_name: 'Away', lat: 19.2, lng: 72.8 },
];
const catA = new Types.ObjectId();
const catB = new Types.ObjectId();
const catC = new Types.ObjectId();

let phoneSeq = 0;
let cityId: string;

const codeOf = async (run: Promise<unknown>) => {
  try {
    await run;
    return 'OK';
  } catch (err) {
    return (err as { extensions?: { code?: string } }).extensions?.code ?? 'THROWN';
  }
};

async function seedUser(first: string, zone?: string | null) {
  phoneSeq += 1;
  const user = await UserModel.create({
    auth: { email: `${first.toLowerCase()}-${phoneSeq}@duncit.com`, phone: { number: String(9876500000 + phoneSeq), extension: '91' } },
    profile: {
      first_name: first,
      last_name: 'Test',
      selected_location_id: zone === null ? null : new Types.ObjectId(cityId),
      selected_zone_name: zone ?? '',
    },
  });
  return String(user._id);
}

async function seedHost(first: string, zone: string | null, over: Record<string, unknown> = {}) {
  const userId = await seedUser(first, zone);
  await HostModel.create({ user_id: userId, full_name: `${first} Full`, status: 'APPROVED', is_active: true, ...over });
  return userId;
}

async function seedVenue(ownerId: string, over: Record<string, unknown> = {}) {
  const v = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Venue',
    ...over,
  });
  return String(v._id);
}

const triple = (level: 'super_category_id' | 'category_id' | 'sub_category_id', id: Types.ObjectId, names = {}) => ({
  [level]: id,
  ...names,
});

beforeEach(async () => {
  const city = await LocationModel.create({
    location_id: `testcity-${new Types.ObjectId().toString()}`,
    location_name: 'Test City',
    city: 'Test City',
    location_image: 'https://img.example.test/city.jpg',
    location_pincode: '400001',
    location_zones: ZONES,
    ...CITY,
  });
  cityId = String(city._id);
});

describe('nearbyHosts', () => {
  let ownerId: string;
  let venueId: string;

  beforeEach(async () => {
    // The owner is a host too, standing right at the centre — never their own result.
    ownerId = await seedHost('Owner', '');
    venueId = await seedVenue(ownerId);
  });

  const search = (args: Record<string, unknown> = {}) =>
    podPartnerSearch.nearbyHosts(ownerId, venueId, { location_id: cityId, ...args });

  it('refuses a malformed venue id, and a venue the caller does not own', async () => {
    expect(await codeOf(podPartnerSearch.nearbyHosts(ownerId, 'nope', { location_id: cityId }))).toBe('BAD_USER_INPUT');
    const stranger = await seedUser('Stranger');
    expect(await codeOf(podPartnerSearch.nearbyHosts(stranger, venueId, { location_id: cityId }))).toBe('FORBIDDEN');
  });

  it('refuses a malformed location and one that cannot be placed on the map', async () => {
    expect(await codeOf(search({ location_id: 'nope' }))).toBe('BAD_USER_INPUT');
    expect(await codeOf(search({ location_id: new Types.ObjectId().toString() }))).toBe('FAILED_PRECONDITION');
  });

  it('returns approved, active, placed hosts within the default 5 km, nearest first, with their summaries', async () => {
    const mid = await seedHost('Mid', 'Mid', {
      host_categories: [triple('category_id', catA, { category_name: 'Sports', sub_category_name: 'Badminton' })],
    });
    const near = await seedHost('Near', 'near');
    await seedHost('Far', 'Far');
    await seedHost('Unplaced', null);
    // Saved a city that no longer exists: cannot be placed, so left out.
    const lost = await seedHost('Lost', 'Near');
    await UserModel.updateOne({ _id: lost }, { $set: { 'profile.selected_location_id': new Types.ObjectId() } });
    await seedHost('Draft', 'Near', { status: 'DRAFT' });
    await seedHost('Paused', 'Near', { is_active: false });

    const found = await search();
    expect(DEFAULT_RADIUS_KM).toBe(5);
    expect(found).toEqual([
      { user_id: near, name: 'Near Test', photo_url: '', categories: [], distance_km: 1.1, open_request_status: null },
      { user_id: mid, name: 'Mid Test', photo_url: '', categories: ['Sports · Badminton'], distance_km: 4.4, open_request_status: null },
    ]);
  });

  it('clamps the radius to 10 km and to 0, and treats a non-number as the default', async () => {
    await seedHost('Near', 'Near');
    await seedHost('Far', 'Far');
    await seedHost('Away', 'Away');
    expect(MAX_RADIUS_KM).toBe(10);
    expect((await search({ radius_km: 500 })).map((h) => h?.name)).toEqual(['Near Test', 'Far Test']);
    expect(await search({ radius_km: -4 })).toEqual([]);
    expect((await search({ radius_km: Number.NaN })).map((h) => h?.name)).toEqual(['Near Test']);
  });

  it('matches a category id at the super, category or sub level, ignoring malformed ids', async () => {
    await seedHost('Super', 'Near', { host_categories: [triple('super_category_id', catA)] });
    await seedHost('Sub', 'Near', { host_categories: [triple('sub_category_id', catA)] });
    await seedHost('Other', 'Near', { host_categories: [triple('category_id', catB)] });

    const byA = await search({ category_ids: [String(catA), 'garbage'] });
    expect(byA.map((h) => h?.name).sort()).toEqual(['Sub Test', 'Super Test']);
    expect(await search({ category_ids: [String(catC)] })).toEqual([]);
    expect(await search({ category_ids: ['garbage'] })).toHaveLength(3);
  });

  it("marks hosts this venue already has an open request with, and not closed ones", async () => {
    const open = await seedHost('Open', 'Near');
    const closed = await seedHost('Closed', 'Near');
    const base = { venue_id: new Types.ObjectId(venueId), venue_owner_user_id: new Types.ObjectId(ownerId) };
    await PodPartnerRequestModel.create({ ...base, direction: 'VENUE_TO_HOST', host_user_id: open, status: 'ACCEPTED' });
    await PodPartnerRequestModel.create({
      ...base,
      direction: 'HOST_TO_VENUE',
      host_user_id: closed,
      status: 'REJECTED',
      is_open: false,
    });

    const found = await search();
    expect(found.find((h) => h?.user_id === open)?.open_request_status).toBe('ACCEPTED');
    expect(found.find((h) => h?.user_id === closed)?.open_request_status).toBeNull();
  });

  it('measures from the selected area when one is given', async () => {
    await seedHost('Away', 'Away');
    expect((await search({ zone_name: 'Away', radius_km: 1 })).map((h) => h?.distance_km)).toEqual([0]);
  });
});

describe('nearbyVenues', () => {
  let hostId: string;

  beforeEach(async () => {
    hostId = await seedUser('Host');
    await UserRoleModel.create({ user_id: hostId, role: 'HOST' });
  });

  const search = (args: Record<string, unknown> = {}) => podPartnerSearch.nearbyVenues(hostId, { location_id: cityId, ...args });

  it('requires an active host', async () => {
    const plain = await seedUser('Plain');
    expect(await codeOf(podPartnerSearch.nearbyVenues(plain, { location_id: cityId }))).toBe('FORBIDDEN');
  });

  it("places venues by their own pin, else their city's area; skips unplaced, unapproved and the host's own", async () => {
    const owner = await seedUser('Owner');
    const pinned = await seedVenue(owner, {
      venue_name: 'Pinned Hall',
      lat: 19.02,
      lng: 72.8,
      venue_category: { category_name: 'Games', sub_category_name: 'Chess', category_id: catA },
      venue_type: 'Cafe',
      capacity: 40,
      locality: 'Near',
      city: 'Test City',
      cover_image_url: 'https://img.example.test/hall.jpg',
    });
    const byArea = await seedVenue(owner, { venue_name: 'Area Hall', location_id: new Types.ObjectId(cityId), locality: 'mid' });
    await seedVenue(owner, { venue_name: 'Far Hall', lat: 19.085, lng: 72.8 });
    await seedVenue(owner, { venue_name: 'Nowhere' });
    await seedVenue(owner, { venue_name: 'Draft Hall', status: 'DRAFT', lat: 19.01, lng: 72.8 });
    await seedVenue(owner, { venue_name: 'Closed Hall', is_active: false, lat: 19.01, lng: 72.8 });
    await seedVenue(hostId, { venue_name: 'My Own Hall', lat: 19.01, lng: 72.8 });

    const found = await search();
    expect(found).toEqual([
      {
        id: pinned,
        venue_name: 'Pinned Hall',
        category: 'Games · Chess',
        venue_type: 'Cafe',
        capacity: 40,
        locality: 'Near',
        city: 'Test City',
        cover_image_url: 'https://img.example.test/hall.jpg',
        distance_km: 2.2,
        open_request_status: null,
      },
      expect.objectContaining({ id: byArea, venue_name: 'Area Hall', category: '', capacity: 0, distance_km: 4.4 }),
    ]);
    expect((await search({ radius_km: 10 })).map((v) => v?.venue_name)).toEqual(['Pinned Hall', 'Area Hall', 'Far Hall']);
  });

  it('filters by category and marks venues the host already has an open request with', async () => {
    const owner = await seedUser('Owner');
    const games = await seedVenue(owner, { lat: 19.01, lng: 72.8, venue_category: { sub_category_id: catB } });
    await seedVenue(owner, { lat: 19.01, lng: 72.8, venue_category: { category_id: catC } });
    await PodPartnerRequestModel.create({
      direction: 'HOST_TO_VENUE',
      venue_id: games,
      venue_owner_user_id: owner,
      host_user_id: hostId,
      status: 'SLOT_REQUESTED',
    });

    const found = await search({ category_ids: [String(catB)] });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ id: games, open_request_status: 'SLOT_REQUESTED' });
  });
});

describe('pairDistanceKm', () => {
  it("measures a venue's pin to the host's saved area, rounded to 0.1 km", async () => {
    const owner = await seedUser('Owner');
    const venue = await seedVenue(owner, { lat: 19, lng: 72.8 });
    const host = await seedUser('Host', 'Mid');
    expect(await pairDistanceKm(venue, host)).toBe(4.4);
  });

  it('is null when either side cannot be placed', async () => {
    const owner = await seedUser('Owner');
    const pinned = await seedVenue(owner, { lat: 19, lng: 72.8 });
    const unplacedVenue = await seedVenue(owner);
    const unplacedHost = await seedUser('Nomad', null);
    const host = await seedUser('Host', 'Near');
    expect(await pairDistanceKm(pinned, unplacedHost)).toBeNull();
    expect(await pairDistanceKm(unplacedVenue, host)).toBeNull();
    expect(await pairDistanceKm(new Types.ObjectId().toString(), host)).toBeNull();
    expect(await pairDistanceKm(pinned, new Types.ObjectId().toString())).toBeNull();
  });
});
