/**
 * The city directory's remaining corners, against a real database: how a city
 * is found (by slug or by id), what an update touches and what it leaves alone,
 * how the launch fields are validated and cleared, the launch backdrops, and the
 * per-request memoised counts the field resolvers read.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { clubService } from '@modules/clubs/club/club.service';
import { locationSubscriptionService } from '@modules/platform/locationSubscription/locationSubscription.service';
import { LocationModel, launchMediaOf, resolveLaunchMedia, LAUNCH_MEDIA_FIELDS, DEFAULT_LAUNCH_TARGET } from '../../location.model';
import { locationResolvers } from '../../location.resolver';
import { locationService } from '../../location.service';

const base = {
  location_name: 'Agra', country: 'India', country_code: 'in', state: 'Uttar Pradesh', state_code: 'up', city: 'Agra',
  location_image: 'https://img/agra.jpg', location_pincode: '282001',
};

afterEach(() => jest.restoreAllMocks());

describe('reading a city', () => {
  it('shows a stored city with every field, the timestamps as text and its zones with their codes', async () => {
    const created = await locationService.create({ ...base, location_zones: [{ zone_name: 'Sadar', zone_code: 'SDR', pincode: '282002' }, { zone_name: 'Bare' }] });
    expect(created).toMatchObject({
      location_id: 'agra', country: 'India', country_code: 'IN', is_active: true, is_launched: true, launch_target: DEFAULT_LAUNCH_TARGET, whatsapp_group_url: '',
      location_zones: [{ zone_name: 'Sadar', zone_code: 'SDR', pincode: '282002', _location_id: created?.id }, { zone_name: 'Bare', zone_code: '', pincode: '' }],
    });
    expect(created?.created_at).toEqual(expect.any(String));
    expect(created?.launch_media).toEqual(launchMediaOf());
  });

  it('shows a zone saved with a null code or pincode as blank, not null', async () => {
    const created = await locationService.create({ ...base, location_zones: [{ zone_name: 'Nulls', zone_code: null as never, pincode: null as never }] });
    expect(created?.location_zones[0]).toMatchObject({ zone_name: 'Nulls', zone_code: '', pincode: '' });
    const stored = await LocationModel.collection.findOne({ location_id: 'agra' });
    expect(stored?.location_zones[0].zone_code).toBeNull();
  });

  it('answers null for a city that is not there', async () => {
    await expect(locationService.getById(String(new Types.ObjectId()))).resolves.toBeNull();
    await expect(locationService.getBySlugOrId('nowhere')).resolves.toBeNull();
  });

  it('finds a city by its slug, case and spacing aside, or by its document id', async () => {
    const agra = await locationService.create(base);
    expect((await locationService.getBySlugOrId('  AGRA '))?.id).toBe(agra?.id);
    expect((await locationService.getBySlugOrId(agra!.id))?.id).toBe(agra?.id);
  });

  it('reads several cities in one go, skipping ids that name none', async () => {
    const a = await locationService.create(base);
    const b = await locationService.create({ ...base, location_name: 'Pune', city: 'Pune' });
    const found = await locationService.listByIds([a!.id, b!.id, String(new Types.ObjectId())]);
    expect(found.map((c) => c.location_name).sort()).toEqual(['Agra', 'Pune']);
  });

  it('lists by activity as well as by search', async () => {
    const a = await locationService.create(base);
    await locationService.create({ ...base, location_name: 'Pune', city: 'Pune' });
    await locationService.update(a!.id, { is_active: false });
    expect((await locationService.list({ is_active: false })).map((c) => c!.location_name)).toEqual(['Agra']);
    expect((await locationService.list({ is_active: true, search: 'pun' })).map((c) => c!.location_name)).toEqual(['Pune']);
    expect(await locationService.list({})).toHaveLength(2);
  });

  it('stamps the launch switch on a city saved before it existed, and says how many it repaired', async () => {
    await LocationModel.collection.insertMany([
      { location_id: 'old-1', location_name: 'Old One', location_image: 'i', location_pincode: '1' },
      { location_id: 'old-2', location_name: 'Old Two', location_image: 'i', location_pincode: '2', is_launched: false },
    ]);
    await expect(locationService.backfillLaunched()).resolves.toEqual({ repaired: 1 });
    await expect(locationService.backfillLaunched()).resolves.toEqual({ repaired: 0 });
    expect(await LocationModel.countDocuments({ is_launched: true })).toBe(1);
  });
});

describe('update', () => {
  it('changes every field it is given, trimming text and upper-casing codes', async () => {
    const city = await locationService.create(base);
    const out = await locationService.update(city!.id, {
      location_name: ' Agra Cantt ', country: ' Bharat ', country_code: ' bh ', state: ' UP ', state_code: ' u ', city: ' Agra City ',
      location_image: 'https://img/new.jpg', location_pincode: ' 282010 ', location_zones: [{ zone_name: 'Taj Ganj' }], is_active: false,
      is_launched: false, launch_target: 500, whatsapp_group_url: 'https://chat.whatsapp.com/abc123',
      launch_media: { hero_image_url: ' https://img/hero.jpg ' },
    });
    expect(out).toMatchObject({
      location_name: 'Agra Cantt', country: 'Bharat', country_code: 'BH', state: 'UP', state_code: 'U', city: 'Agra City', location_image: 'https://img/new.jpg',
      location_pincode: '282010', is_active: false, is_launched: false, launch_target: 500, whatsapp_group_url: 'https://chat.whatsapp.com/abc123',
      location_zones: [{ zone_name: 'Taj Ganj' }],
    });
    expect(out?.launch_media.hero_image_url).toBe('https://img/hero.jpg');
  });

  it('leaves everything it was not given, and a null launch field, alone', async () => {
    const city = await locationService.create({ ...base, launch_target: 300, whatsapp_group_url: 'https://chat.whatsapp.com/keep' });
    const out = await locationService.update(city!.id, { city: 'Renamed', launch_target: null, whatsapp_group_url: null, is_launched: null, launch_media: null });
    expect(out).toMatchObject({ city: 'Renamed', location_name: 'Agra', launch_target: 300, whatsapp_group_url: 'https://chat.whatsapp.com/keep', is_launched: true });
  });

  it('clears the group link with an empty one, and replaces the whole backdrop set when one is sent', async () => {
    const city = await locationService.create({ ...base, whatsapp_group_url: 'https://chat.whatsapp.com/abc', launch_media: { hero_image_url: 'https://img/a.jpg', host_image_url: 'https://img/b.jpg' } });
    const out = await locationService.update(city!.id, { whatsapp_group_url: '', launch_media: { host_image_url: 'https://img/c.jpg' } });
    expect(out?.whatsapp_group_url).toBe('');
    expect(out?.launch_media).toEqual({ ...launchMediaOf(), host_image_url: 'https://img/c.jpg' });
  });

  it('refuses a launch field that is not valid, and a city that is not there', async () => {
    const city = await locationService.create(base);
    await expect(locationService.update(city!.id, { launch_target: 0 })).rejects.toBeDefined();
    await expect(locationService.update(city!.id, { whatsapp_group_url: 'https://example.com/x' })).rejects.toBeDefined();
    await expect(locationService.update(city!.id, { launch_media: { hero_image_url: 'not a url' } })).rejects.toBeDefined();
    await expect(locationService.update(String(new Types.ObjectId()), { city: 'x' })).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('says NOT_FOUND removing a city that is not there', async () => {
    await expect(locationService.remove(String(new Types.ObjectId()))).rejects.toMatchObject({ message: 'Location not found', extensions: { code: 'NOT_FOUND' } });
  });
});

describe('create with the launch fields', () => {
  it('accepts a launch target, a group link, a switch and backdrops, and uses a given id over the derived one', async () => {
    const out = await locationService.create({
      ...base, location_id: ' Taj-City ', is_launched: false, launch_target: 750, whatsapp_group_url: 'https://chat.whatsapp.com/xyz', launch_media: { venue_video_url: 'https://v/x.mp4' },
    });
    expect(out).toMatchObject({ location_id: 'taj-city', is_launched: false, launch_target: 750, whatsapp_group_url: 'https://chat.whatsapp.com/xyz' });
    expect(out?.launch_media.venue_video_url).toBe('https://v/x.mp4');
  });

  it('derives the id from a name with punctuation', async () => {
    expect((await locationService.create({ ...base, location_name: ' New  Delhi! ', city: 'New Delhi' }))?.location_id).toBe('new-delhi');
  });
});

describe('the backdrops', () => {
  it('reads each as a trimmed string, empty when unset, whatever the input', () => {
    expect(launchMediaOf(undefined)).toEqual(Object.fromEntries(LAUNCH_MEDIA_FIELDS.map((f) => [f, ''])));
    expect(launchMediaOf(null)).toEqual(launchMediaOf(undefined));
    expect(launchMediaOf({ hero_image_url: '  https://a  ', host_image_url: null, venue_image_url: '' })).toMatchObject({ hero_image_url: 'https://a', host_image_url: '', venue_image_url: '', hero_video_url: '' });
  });

  it('plays the city’s own file where it set one, else the global one', () => {
    const global = launchMediaOf({ hero_image_url: 'https://g/hero', host_image_url: 'https://g/host' });
    const own = launchMediaOf({ hero_image_url: 'https://c/hero' });
    expect(resolveLaunchMedia(own, global)).toMatchObject({ hero_image_url: 'https://c/hero', host_image_url: 'https://g/host', venue_image_url: '' });
  });
});

describe('the field resolvers', () => {
  const Location = locationResolvers.Location as Record<string, (...a: any[]) => Promise<number>>;
  const Zone = locationResolvers.LocationZone as Record<string, (...a: any[]) => Promise<number>>;

  it('count a city’s active clubs and subscribers from one aggregate per request, and say zero for a city with none', async () => {
    const clubs = jest.spyOn(clubService, 'activeClubCountsByLocation').mockResolvedValue({ c1: 4 });
    const subs = jest.spyOn(locationSubscriptionService, 'countsByLocation').mockResolvedValue({ c1: 9 });
    const ctx = makeContext({ id: 'u', roles: [] });
    await expect(Location.active_club_count({ id: 'c1' }, {}, ctx)).resolves.toBe(4);
    await expect(Location.active_club_count({ id: 'c2' }, {}, ctx)).resolves.toBe(0);
    await expect(Location.subscriber_count({ id: 'c1' }, {}, ctx)).resolves.toBe(9);
    await expect(Location.subscriber_count({ id: 'c2' }, {}, ctx)).resolves.toBe(0);
    expect(clubs).toHaveBeenCalledTimes(1);
    expect(subs).toHaveBeenCalledTimes(1);
  });

  it('count a locality’s active clubs from the per-locality aggregate, once per request', async () => {
    const byLocality = jest.spyOn(clubService, 'activeClubCountsByLocality').mockResolvedValue({ 'c1|Sadar': 3 });
    const ctx = makeContext({ id: 'u', roles: [] });
    await expect(Zone.active_club_count({ zone_name: 'Sadar', _location_id: 'c1' }, {}, ctx)).resolves.toBe(3);
    await expect(Zone.active_club_count({ zone_name: 'Taj Ganj', _location_id: 'c1' }, {}, ctx)).resolves.toBe(0);
    expect(byLocality).toHaveBeenCalledTimes(1);
  });
});

describe('the resolvers', () => {
  const Q = locationResolvers.Query as Record<string, (...a: any[]) => Promise<any>>;
  const M = locationResolvers.Mutation as Record<string, (...a: any[]) => Promise<any>>;
  const admin = makeContext({ id: 'a', roles: ['CITY_ADMIN'] });

  it('read publicly and change only for admins', async () => {
    const created = await M.createLocation({}, { input: base }, admin);
    expect(await Q.locations({}, { filter: { search: 'agra' } })).toHaveLength(1);
    expect((await Q.locationsTable({}, { query: { page: 1, page_size: 5 } })).total).toBe(1);
    expect((await Q.location({}, { location_doc_id: created.id })).location_name).toBe('Agra');
    expect((await M.updateLocation({}, { location_doc_id: created.id, input: { city: 'Agra!' } }, admin)).city).toBe('Agra!');
    await expect(M.deleteLocation({}, { location_doc_id: created.id }, makeContext({ id: 'u', roles: ['USER'] }))).rejects.toThrow(/access denied/i);
    await expect(M.updateLocation({}, { location_doc_id: created.id, input: {} }, makeContext(null))).rejects.toThrow();
    await expect(M.deleteLocation({}, { location_doc_id: created.id }, admin)).resolves.toBe(true);
  });
});
