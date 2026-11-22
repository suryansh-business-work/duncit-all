/**
 * Nearby leads end to end on a real database: leads are placed the first time
 * a search needs them (map-link pin, else area, else city — all from cached
 * Location coordinates, so Google is never called), the page holds only the
 * leads inside the radius with their distance, nearest first, under the
 * table's own search and filters, and editing a lead's location re-places it.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn().mockResolvedValue('') }));

import { Types } from 'mongoose';
import { LocationModel } from '@modules/platform/location/location.model';
import { cityAreaPoint } from '@modules/platform/location/location.geo';
import { EcommLeadModel, HostLeadModel, VenueLeadModel } from '@modules/crm/crm/crm.model';
import { crmService } from '@modules/crm/crm/crm.service';
import { CommunityLeadModel, CreatorLeadModel } from '@modules/crm/prospectLead/prospectLead.model';
import { prospectLeadService } from '@modules/crm/prospectLead/prospectLead.service';
import { placeUnplacedLeads } from '../../leadGeo.place';

const BANDRA = { lat: 19.0596, lng: 72.8295 };

async function seedLocations() {
  const base = { country: 'India', location_image: 'https://img.example.test/city.jpg' };
  await LocationModel.create([
    {
      ...base,
      location_id: `mumbai-${new Types.ObjectId().toString()}`,
      location_name: 'Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      location_pincode: '400001',
      lat: 19.076,
      lng: 72.8777,
      location_zones: [
        { zone_name: 'Bandra', ...BANDRA },
        { zone_name: 'Andheri', lat: 19.1136, lng: 72.8697 },
      ],
    },
    {
      ...base,
      location_id: `pune-${new Types.ObjectId().toString()}`,
      location_name: 'Pune',
      city: 'Pune',
      state: 'Maharashtra',
      location_pincode: '411001',
      lat: 18.5204,
      lng: 73.8567,
    },
  ]);
}

const venue = (venue_name: string, over: Record<string, unknown> = {}) =>
  VenueLeadModel.create({ venue_name, city: 'Mumbai', full_address: `${venue_name} road`, ...over });

const names = (rows: Array<{ venue_name?: string }>) => rows.map((row) => row.venue_name);

beforeAll(async () => {
  await Promise.all(
    [VenueLeadModel, HostLeadModel, EcommLeadModel, CreatorLeadModel, CommunityLeadModel].map((model) =>
      model.createIndexes()
    )
  );
});

beforeEach(seedLocations);

describe('cityAreaPoint', () => {
  it("finds a lead's city by name, ignoring case, and its area inside it", async () => {
    await expect(cityAreaPoint(' mumbai ', 'bandra')).resolves.toEqual(BANDRA);
    await expect(cityAreaPoint('Mumbai')).resolves.toEqual({ lat: 19.076, lng: 72.8777 });
  });

  it('places nothing for a blank or unknown city, and never matches a partial name', async () => {
    await expect(cityAreaPoint('  ')).resolves.toBeNull();
    await expect(cityAreaPoint('Mum')).resolves.toBeNull();
    await expect(cityAreaPoint('Atlantis')).resolves.toBeNull();
  });
});

describe('nearby venue leads', () => {
  beforeEach(async () => {
    await venue('Bandra Arena', { area: 'Bandra' });
    await venue('Pinned Cafe', { map_link: 'https://www.google.com/maps/place/Cafe/@19.06,72.83,17z' });
    await venue('City Hall', {});
    await venue('Andheri Turf', { area: 'Andheri' });
    await venue('Pune Courts', { city: 'Pune' });
  });

  it('lists only the leads inside the radius, nearest first, with their distance and precision', async () => {
    const page = await crmService.venueLeadsTable(undefined, { ...BANDRA, radius_km: 6 });
    expect(names(page.rows)).toEqual(['Bandra Arena', 'Pinned Cafe', 'City Hall']);
    expect(page.total).toBe(3);
    expect(page.unplaced).toBe(0);
    const [bandra, pinned, city] = page.rows as Array<{ distance_km: number; geo_precision: string }>;
    expect(bandra.distance_km).toBeCloseTo(0, 3);
    expect(bandra.geo_precision).toBe('AREA');
    expect(pinned.geo_precision).toBe('PIN');
    expect(pinned.distance_km).toBeGreaterThan(0);
    expect(pinned.distance_km).toBeLessThan(0.2);
    expect(city.geo_precision).toBe('CITY');
    expect(city.distance_km).toBeGreaterThan(5);
    expect(city.distance_km).toBeLessThan(6);
  });

  it('widens with the radius and keeps search, filters, sort and paging of the table', async () => {
    const wide = await crmService.venueLeadsTable({ page_size: 2 }, { ...BANDRA, radius_km: 10 });
    expect(wide.total).toBe(4);
    expect(names(wide.rows)).toEqual(['Bandra Arena', 'Pinned Cafe']);

    const searched = await crmService.venueLeadsTable({ search: 'turf' }, { ...BANDRA, radius_km: 10 });
    expect(names(searched.rows)).toEqual(['Andheri Turf']);

    const sorted = await crmService.venueLeadsTable(
      { sort_by: 'venue_name', sort_dir: 'asc' },
      { ...BANDRA, radius_km: 10 }
    );
    expect(names(sorted.rows)).toEqual(['Andheri Turf', 'Bandra Arena', 'City Hall', 'Pinned Cafe']);

    const close = await crmService.venueLeadsTable(
      { filters: [{ field: 'distance_km', op: 'lte', value: '1' }] },
      { ...BANDRA, radius_km: 10 }
    );
    expect(names(close.rows)).toEqual(['Bandra Arena', 'Pinned Cafe']);
  });

  it('searches around a picked city and area', async () => {
    const page = await crmService.venueLeadsTable(undefined, { city: 'Pune', radius_km: 2 });
    expect(names(page.rows)).toEqual(['Pune Courts']);
  });

  it('leaves the plain table untouched: no distance, no unplaced count', async () => {
    const page = await crmService.venueLeadsTable({ sort_by: 'venue_name', sort_dir: 'asc' });
    expect(page.total).toBe(5);
    expect(page.unplaced).toBeNull();
    expect((page.rows[0] as { distance_km?: number }).distance_km).toBeUndefined();
  });

  it('re-places a lead whose location is edited, and keeps the point on other edits', async () => {
    await crmService.venueLeadsTable(undefined, { ...BANDRA, radius_km: 6 });
    const andheri = await VenueLeadModel.findOne({ venue_name: 'Andheri Turf' }).lean();
    expect(andheri?.geo_precision).toBe('AREA');

    await crmService.updateVenueLead(String(andheri?._id), { lead_status: 'Contacted' });
    expect((await VenueLeadModel.findById(andheri?._id).lean())?.geo_checked_at).toBeTruthy();

    await crmService.updateVenueLead(String(andheri?._id), { city: 'Mumbai', area: 'Bandra' });
    const edited = await VenueLeadModel.findById(andheri?._id).lean();
    expect(edited?.geo).toBeUndefined();
    expect(edited?.geo_checked_at).toBeUndefined();

    const page = await crmService.venueLeadsTable(undefined, { ...BANDRA, radius_km: 1 });
    expect(names(page.rows)).toContain('Andheri Turf');
  });

  it('refuses a radius out of bounds before reading anything', async () => {
    await expect(crmService.venueLeadsTable(undefined, { ...BANDRA, radius_km: 80 })).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await VenueLeadModel.countDocuments({ geo_checked_at: { $exists: true } })).toBe(0);
  });
});

describe('leads that cannot be placed', () => {
  it('are counted, marked checked so they are not retried, and left out of the page', async () => {
    await HostLeadModel.create([
      { host_name: 'Near Host', city: 'Mumbai', area: 'Bandra' },
      { host_name: 'No City Host' },
      { host_name: 'Unknown City Host', city: 'Atlantis' },
    ]);
    const page = await crmService.hostLeadsTable(undefined, { ...BANDRA, radius_km: 2 });
    expect(page.rows.map((row: { host_name?: string }) => row.host_name)).toEqual(['Near Host']);
    expect(page.unplaced).toBe(2);
    expect(await HostLeadModel.countDocuments({ geo_checked_at: null })).toBe(0);
    await expect(placeUnplacedLeads('HOST_LEAD')).resolves.toBe(0);
  });

  it('are placed in batches, the rest on the next search', async () => {
    await EcommLeadModel.create([
      { seller_name: 'One', city: 'Mumbai' },
      { seller_name: 'Two', city: 'Mumbai' },
      { seller_name: 'Three', city: 'Mumbai' },
    ]);
    await expect(placeUnplacedLeads('ECOMM_LEAD', 2)).resolves.toBe(2);
    expect(await EcommLeadModel.countDocuments({ geo_checked_at: null })).toBe(1);
    await expect(placeUnplacedLeads('ECOMM_LEAD', 2)).resolves.toBe(1);
  });
});

describe('nearby creator and community leads', () => {
  it('search the prospect kinds the same way, and edits there re-place the lead too', async () => {
    const near = await CreatorLeadModel.create({ creator_name: 'Bandra Creator', city: 'Mumbai', area: 'Bandra' });
    await CreatorLeadModel.create({ creator_name: 'Pune Creator', city: 'Pune' });
    await CommunityLeadModel.create({ community_name: 'Runners', city: 'Mumbai', area: 'Andheri' });

    const creators = await prospectLeadService.table('CREATOR_LEAD', undefined, { ...BANDRA, radius_km: 5 });
    expect(creators.rows.map((row: { creator_name?: string }) => row.creator_name)).toEqual(['Bandra Creator']);

    const communities = await prospectLeadService.table('COMMUNITY_LEAD', undefined, { ...BANDRA, radius_km: 10 });
    expect(communities.rows.map((row: { community_name?: string }) => row.community_name)).toEqual(['Runners']);

    await prospectLeadService.update('CREATOR_LEAD', String(near._id), { area: 'Andheri' });
    expect((await CreatorLeadModel.findById(near._id).lean())?.geo_checked_at).toBeUndefined();
  });
});
