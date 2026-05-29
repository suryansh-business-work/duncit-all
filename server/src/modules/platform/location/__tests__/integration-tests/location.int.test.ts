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
});
