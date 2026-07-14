import { locationService } from '../../location.service';
import { LocationModel } from '../../location.model';

const baseInput = {
  location_name: 'Mumbai',
  country: 'India',
  country_code: 'in',
  state: 'Maharashtra',
  state_code: 'mh',
  city: 'Mumbai',
  location_image: 'https://img/mumbai.jpg',
  location_pincode: '400001',
};

describe('locationService integration', () => {
  it('creates a location, derives an id and uppercases codes', async () => {
    const created = await locationService.create(baseInput);
    expect(created!.location_id).toBe('mumbai');
    expect(created!.country_code).toBe('IN');
    expect(created!.state_code).toBe('MH');
  });

  it('prevents duplicate location ids', async () => {
    await locationService.create(baseInput);
    await expect(locationService.create(baseInput)).rejects.toThrow(/already exists/i);
  });

  it('lists, filters by search and fetches by id', async () => {
    const a = await locationService.create(baseInput);
    await locationService.create({ ...baseInput, location_name: 'Delhi', city: 'Delhi' });

    expect(await locationService.list()).toHaveLength(2);
    expect(await locationService.list({ search: 'delhi' })).toHaveLength(1);
    expect((await locationService.getById(a!.id))?.location_name).toBe('Mumbai');
  });

  it('updates and removes a location', async () => {
    const loc = await locationService.create(baseInput);
    const updated = await locationService.update(loc!.id, { is_active: false, city: 'Navi Mumbai' });
    expect(updated!.is_active).toBe(false);
    expect(updated!.city).toBe('Navi Mumbai');

    expect(await locationService.remove(loc!.id)).toBe(true);
    expect(await LocationModel.countDocuments()).toBe(0);
  });

  it('serves the locationsTable page with search, filters, sort and paging', async () => {
    await locationService.create(baseInput); // Mumbai
    await locationService.create({
      ...baseInput,
      location_name: 'Delhi',
      city: 'Delhi',
      state: 'Delhi',
      state_code: 'DL',
      location_pincode: '110001',
      location_zones: [{ zone_name: 'Saket', pincode: '110017' }],
    });
    const pune = await locationService.create({ ...baseInput, location_name: 'Pune', city: 'Pune' });
    await locationService.update(pune!.id, { is_active: false });

    // Default sort matches list() (location_name asc) with clamp defaults.
    const all = await locationService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((l) => l!.location_name)).toEqual(['Delhi', 'Mumbai', 'Pune']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans the same paths as the legacy list(): city, pincode, zone names.
    const byZone = await locationService.table({ search: 'saket' });
    expect(byZone.rows.map((l) => l!.location_name)).toEqual(['Delhi']);
    const byPincode = await locationService.table({ search: '400001' });
    expect(byPincode.total).toBe(2); // Mumbai + Pune share the base pincode

    // Boolean + string filters narrow.
    const inactive = await locationService.table({ filters: [{ field: 'is_active', op: 'is_false' }] });
    expect(inactive.rows.map((l) => l!.location_name)).toEqual(['Pune']);
    const maharashtra = await locationService.table({
      filters: [{ field: 'state', op: 'eq', value: 'Maharashtra' }],
    });
    expect(maharashtra.rows.map((l) => l!.location_name)).toEqual(['Mumbai', 'Pune']);

    // Allowlisted sort, descending.
    const desc = await locationService.table({ sort_by: 'location_name', sort_dir: 'desc' });
    expect(desc.rows.map((l) => l!.location_name)).toEqual(['Pune', 'Mumbai', 'Delhi']);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await locationService.table({ page: 2, page_size: 1 });
    expect(page2.rows.map((l) => l!.location_name)).toEqual(['Mumbai']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
