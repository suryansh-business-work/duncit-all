import { Types } from 'mongoose';
import { LocationModel } from '@modules/platform/location/location.model';
import { effectiveRoleKeys } from '@modules/access/user/effective-roles';
import { gigJobService } from '../../gigJob.service';
import { freelancerService } from '../../freelancer.service';
import { FreelancerProfileModel, GigCategoryModel, GigInterestModel, GigJobModel } from '../../gigJob.model';

jest.mock('@modules/access/user/effective-roles', () => ({
  effectiveRoleKeys: jest.fn(),
}));
// Saving a freelancer profile hands out the FREELANCER role — not under test here.
jest.mock('@modules/access/user/user.service', () => ({
  userService: { assignRoles: jest.fn() },
}));

const roles = effectiveRoleKeys as jest.MockedFunction<typeof effectiveRoleKeys>;

const poster = new Types.ObjectId().toHexString();
const viewer = new Types.ObjectId().toHexString();

const seedCity = (over: Record<string, unknown> = {}) =>
  LocationModel.create({
    location_id: `city-${new Types.ObjectId().toHexString()}`,
    location_name: 'Lucknow',
    city: 'Lucknow',
    location_pincode: '226001',
    location_image: 'https://ik.imagekit.io/duncit/lucknow.jpg',
    location_zones: [{ zone_name: 'Gomti Nagar' }, { zone_name: 'Hazratganj' }],
    ...over,
  });

const seedCategory = () => GigCategoryModel.create({ slug_id: 'photo', title: 'Photography', examples: ['Photographer'] });

const postInput = (categoryId: string, over: Record<string, unknown> = {}) => ({
  poster_role: 'HOST',
  category_id: categoryId,
  title: 'Photographer for a pottery workshop',
  roles: ['Photographer'],
  event_date: null,
  contact_name: 'Asha',
  contact_phone: '+919876543210',
  contact_email: 'asha@example.com',
  ...over,
});

/** A row as an older client wrote it: typed city, no Location. */
const seedLegacyGig = (categoryId: string, city: string) =>
  GigJobModel.create({
    poster_user_id: new Types.ObjectId(poster),
    poster_role: 'HOST',
    category_id: categoryId,
    title: `Legacy gig in ${city}`,
    city,
    contact_name: 'Old Poster',
    contact_phone: '+919800000000',
  });

beforeEach(() => {
  roles.mockResolvedValue(['USER', 'HOST']);
});

describe('gigJobService.create — the place', () => {
  it('stores the Location, copies its city name and keeps the zone in its own spelling', async () => {
    const [city, category] = await Promise.all([seedCity(), seedCategory()]);
    const row = await gigJobService.create(
      poster,
      postInput(String(category._id), { location_id: String(city._id), locality: '  gomti nagar ', city: 'typed anything' })
    );
    expect(row).toMatchObject({ location_id: String(city._id), locality: 'Gomti Nagar', city: 'Lucknow' });
    // A null event date is "no date yet", not a validation failure.
    expect(row.event_date).toBeNull();
  });

  it('falls back to the location name when the Location has no city', async () => {
    const [city, category] = await Promise.all([seedCity({ city: '', location_name: 'Navi Mumbai' }), seedCategory()]);
    const row = await gigJobService.create(poster, postInput(String(category._id), { location_id: String(city._id) }));
    expect(row).toMatchObject({ city: 'Navi Mumbai', locality: '' });
  });

  it('refuses a switched-off Location, an unknown one and a malformed id', async () => {
    const [off, category] = await Promise.all([seedCity({ is_active: false }), seedCategory()]);
    const categoryId = String(category._id);
    await expect(gigJobService.create(poster, postInput(categoryId, { location_id: String(off._id) }))).rejects.toThrow(
      'Pick a city from the list'
    );
    await expect(
      gigJobService.create(poster, postInput(categoryId, { location_id: new Types.ObjectId().toHexString() }))
    ).rejects.toThrow('Pick a city from the list');
    await expect(gigJobService.create(poster, postInput(categoryId, { location_id: 'not-an-id' }))).rejects.toThrow(
      'Pick a city from the list'
    );
    expect(await GigJobModel.countDocuments()).toBe(0);
  });

  it('refuses an area the city does not have', async () => {
    const [city, category] = await Promise.all([seedCity(), seedCategory()]);
    await expect(
      gigJobService.create(poster, postInput(String(category._id), { location_id: String(city._id), locality: 'Bandra' }))
    ).rejects.toThrow('Pick an area of that city from the list');
  });

  it('still accepts a typed city from an older client, and drops a locality it cannot place', async () => {
    const category = await seedCategory();
    const row = await gigJobService.create(poster, postInput(String(category._id), { city: ' Pune ', locality: 'Baner' }));
    expect(row).toMatchObject({ location_id: null, city: 'Pune', locality: '' });
  });

  it('needs a Location or a typed city', async () => {
    const category = await seedCategory();
    await expect(gigJobService.create(poster, postInput(String(category._id)))).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', errors: ['City is required'] },
    });
  });
});

describe('gigJobService.update — the place', () => {
  it('may keep a Location an admin switched off since, but not move to another switched-off one', async () => {
    const [city, other, category] = await Promise.all([seedCity(), seedCity({ is_active: false }), seedCategory()]);
    const created = await gigJobService.create(poster, postInput(String(category._id), { location_id: String(city._id) }));
    await LocationModel.updateOne({ _id: city._id }, { $set: { is_active: false } });

    const kept = await gigJobService.update(
      poster,
      created.id,
      postInput(String(category._id), { location_id: String(city._id), title: 'Photographer, renamed' })
    );
    expect(kept).toMatchObject({ location_id: String(city._id), title: 'Photographer, renamed' });

    await expect(
      gigJobService.update(poster, created.id, postInput(String(category._id), { location_id: String(other._id) }))
    ).rejects.toThrow('Pick a city from the list');
  });
});

describe('gigJobService.board — the city filter', () => {
  it('finds gigs in the Location and legacy rows typed with its name, and nothing from other cities', async () => {
    const [lucknow, pune, category] = await Promise.all([
      seedCity(),
      seedCity({ location_name: 'Pune', city: 'Pune', location_zones: [] }),
      seedCategory(),
    ]);
    const categoryId = String(category._id);
    await gigJobService.create(poster, postInput(categoryId, { location_id: String(lucknow._id), title: 'Lucknow placed' }));
    await gigJobService.create(poster, postInput(categoryId, { location_id: String(pune._id), title: 'Pune placed' }));
    await seedLegacyGig(String(category._id), 'lucknow');
    await seedLegacyGig(String(category._id), 'Lucknow East');

    const page = await gigJobService.board(viewer, { location_id: String(lucknow._id) });
    expect(page.total).toBe(2);
    expect(page.rows.map((row) => row.title).sort((a, b) => a.localeCompare(b))).toEqual([
      'Legacy gig in lucknow',
      'Lucknow placed',
    ]);
  });

  it('combines the city with the free-text search rather than one replacing the other', async () => {
    const [lucknow, category] = await Promise.all([seedCity(), seedCategory()]);
    const categoryId = String(category._id);
    await gigJobService.create(poster, postInput(categoryId, { location_id: String(lucknow._id), title: 'Wedding DJ' }));
    await gigJobService.create(poster, postInput(categoryId, { location_id: String(lucknow._id), title: 'Caterer' }));
    await gigJobService.create(poster, postInput(categoryId, { city: 'Pune', title: 'Pune DJ' }));

    const page = await gigJobService.board(viewer, { location_id: String(lucknow._id), search: 'dj' });
    expect(page.rows.map((row) => row.title)).toEqual(['Wedding DJ']);
  });

  it('keeps the typed-city filter older clients send, matched whole and case-insensitively', async () => {
    const category = await seedCategory();
    await seedLegacyGig(String(category._id), 'Pune');
    expect((await gigJobService.board(viewer, { city: 'pune' })).total).toBe(1);
    expect((await gigJobService.board(viewer, { city: 'Pu' })).total).toBe(0);
  });

  it('ignores a malformed location id instead of failing the board', async () => {
    const category = await seedCategory();
    await seedLegacyGig(String(category._id), 'Pune');
    expect((await gigJobService.board(viewer, { location_id: 'nope' })).total).toBe(1);
  });
});

describe('gigJobService.revealContact', () => {
  const seedOpenGig = async () => {
    const category = await seedCategory();
    return gigJobService.create(poster, postInput(String(category._id), { city: 'Pune' }));
  };

  it('hands any signed-in member the poster contact, which the gig itself does not carry for them', async () => {
    const job = await seedOpenGig();
    expect((await gigJobService.get(viewer, job.id))?.contact).toBeNull();
    await expect(gigJobService.revealContact(viewer, job.id)).resolves.toEqual({
      name: 'Asha',
      phone: '+919876543210',
      email: 'asha@example.com',
    });
  });

  it('answers on a closed gig only for the poster and freelancers who showed interest', async () => {
    const job = await seedOpenGig();
    const interested = new Types.ObjectId();
    await GigInterestModel.create({ job_id: job.id, poster_user_id: poster, freelancer_user_id: interested });
    await gigJobService.setStatus(poster, job.id, 'CLOSED');

    await expect(gigJobService.revealContact(viewer, job.id)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(gigJobService.revealContact(poster, job.id)).resolves.toMatchObject({ name: 'Asha' });
    await expect(gigJobService.revealContact(interested.toHexString(), job.id)).resolves.toMatchObject({ name: 'Asha' });
  });

  it('is NOT_FOUND for a missing gig and a malformed id', async () => {
    await expect(gigJobService.revealContact(viewer, new Types.ObjectId().toHexString())).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(gigJobService.revealContact(viewer, 'nope')).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });
});

describe('freelancerService.save — the place', () => {
  const profileInput = (categoryId: string, over: Record<string, unknown> = {}) => ({
    display_name: 'Ravi',
    category_ids: [categoryId],
    skills: ['Photographer'],
    contact_phone: '+919876543210',
    ...over,
  });

  it('stores the Location and its zone, and returns them', async () => {
    const [city, category] = await Promise.all([seedCity(), seedCategory()]);
    const saved = await freelancerService.save(
      viewer,
      profileInput(String(category._id), { location_id: String(city._id), locality: 'hazratganj' })
    );
    expect(saved).toMatchObject({ location_id: String(city._id), locality: 'Hazratganj', city: 'Lucknow' });
  });

  it('keeps a profile whose Location was switched off since, and refuses an unknown one', async () => {
    const [city, category] = await Promise.all([seedCity(), seedCategory()]);
    const input = profileInput(String(category._id), { location_id: String(city._id) });
    await freelancerService.save(viewer, input);
    await LocationModel.updateOne({ _id: city._id }, { $set: { is_active: false } });
    await expect(freelancerService.save(viewer, { ...input, display_name: 'Ravi K' })).resolves.toMatchObject({
      display_name: 'Ravi K',
      city: 'Lucknow',
    });
    await expect(
      freelancerService.save(viewer, { ...input, location_id: new Types.ObjectId().toHexString() })
    ).rejects.toThrow('Pick a city from the list');
    expect(await FreelancerProfileModel.countDocuments()).toBe(1);
  });

  it('still saves a typed city from an older client', async () => {
    const category = await seedCategory();
    await expect(freelancerService.save(viewer, profileInput(String(category._id), { city: 'Pune' }))).resolves.toMatchObject({
      location_id: null,
      city: 'Pune',
    });
  });
});
