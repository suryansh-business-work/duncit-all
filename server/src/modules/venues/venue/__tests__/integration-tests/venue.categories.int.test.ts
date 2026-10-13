/**
 * A venue in several categories, against a real database: which input wins,
 * de-duplication and the cap, the list ↔ legacy mirror the model keeps on every
 * save, and every matcher (public filters, club auto-match, the admin table)
 * finding a venue through ANY of its categories — including a document stored
 * before the list existed, which has only the legacy triple.
 */
jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { venueService } from '../../venue.service';
import { VenueModel } from '../../venue.model';
import { VENUE_CATEGORY_LIMIT } from '../../venue.constants';
import { LocationModel } from '@modules/platform/location/location.model';
import { CategoryModel } from '@modules/pods/category/category.model';

const oid = () => new Types.ObjectId();
const newOwner = () => String(oid());

interface Triple {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
}

let locId: string;
let padel: Triple;
let squash: Triple;
let yoga: Triple;

/** Sports → Racquet → {Padel, Squash}, and Wellness → Mind → Yoga. */
async function seedTaxonomy() {
  const mk = (name: string, level: string, parent?: Types.ObjectId) =>
    CategoryModel.create({ name, slug: `${name.toLowerCase()}-${oid()}`, level, parent_id: parent ?? null });
  const sportsCat = await mk('Sports', 'SUPER');
  const racquet = await mk('Racquet', 'CATEGORY', sportsCat._id);
  const padelCat = await mk('Padel', 'SUB', racquet._id);
  const squashCat = await mk('Squash', 'SUB', racquet._id);
  const wellness = await mk('Wellness', 'SUPER');
  const mind = await mk('Mind', 'CATEGORY', wellness._id);
  const yogaCat = await mk('Yoga', 'SUB', mind._id);
  const of = (s: { _id: unknown }, c: { _id: unknown }, sub: { _id: unknown }): Triple => ({
    super_category_id: String(s._id),
    category_id: String(c._id),
    sub_category_id: String(sub._id),
  });
  padel = of(sportsCat, racquet, padelCat);
  squash = of(sportsCat, racquet, squashCat);
  yoga = of(wellness, mind, yogaCat);
}

/** The stored subdocument for a triple — ids as ObjectIds, names denormalised. */
const stored = (t: Triple, names: [string, string, string]) => ({
  super_category_id: new Types.ObjectId(t.super_category_id),
  category_id: new Types.ObjectId(t.category_id),
  sub_category_id: new Types.ObjectId(t.sub_category_id),
  super_category_name: names[0],
  category_name: names[1],
  sub_category_name: names[2],
});
const PADEL: [string, string, string] = ['Sports', 'Racquet', 'Padel'];
const SQUASH: [string, string, string] = ['Sports', 'Racquet', 'Squash'];
const YOGA: [string, string, string] = ['Wellness', 'Mind', 'Yoga'];

const subNames = (v: { venue_categories: { sub_category_name: string }[] }) =>
  v.venue_categories.map((c) => c.sub_category_name);

beforeEach(async () => {
  const location = await LocationModel.create({
    location_id: `loc-${oid()}`,
    location_name: 'Bengaluru',
    country: 'India',
    country_code: 'IN',
    state: 'Karnataka',
    state_code: 'KA',
    city: 'Bengaluru',
    location_image: 'https://img.example.test/blr.jpg',
    location_pincode: '560001',
    location_zones: [],
  });
  locId = String(location._id);
  await seedTaxonomy();
});

const step1 = (owner: string, input: Record<string, unknown>) =>
  venueService.submitStep1(owner, { location_id: locId, venue_name: 'Court House', ...input });

describe('step 1 — which input wins', () => {
  it('stores the whole list, validated and denormalised, and mirrors its first entry', async () => {
    const out = await step1(newOwner(), { venue_categories: [yoga, padel] });

    expect(subNames(out)).toEqual(['Yoga', 'Padel']);
    expect(out.venue_categories[0]).toEqual({ ...yoga, super_category_name: 'Wellness', category_name: 'Mind', sub_category_name: 'Yoga' });
    expect(out.venue_category).toEqual(out.venue_categories[0]);

    const doc = await VenueModel.findById(out.id).lean();
    expect(doc?.venue_categories).toEqual([stored(yoga, YOGA), stored(padel, PADEL)]);
    expect(doc?.venue_category).toEqual(stored(yoga, YOGA));
  });

  it('the list wins when both are sent — the single is derived, never trusted', async () => {
    const out = await step1(newOwner(), { venue_categories: [squash, yoga], venue_category: padel });
    expect(subNames(out)).toEqual(['Squash', 'Yoga']);
    expect(out.venue_category.sub_category_name).toBe('Squash');
  });

  it('a client that sends only the single gets a one-entry list', async () => {
    const out = await step1(newOwner(), { venue_category: padel });
    expect(subNames(out)).toEqual(['Padel']);
    expect(out.venue_category).toEqual(out.venue_categories[0]);
  });

  it('an empty list is "not sent": it falls back to the single, else changes nothing', async () => {
    const owner = newOwner();
    const first = await step1(owner, { venue_categories: [], venue_category: padel });
    expect(subNames(first)).toEqual(['Padel']);

    const untouched = await step1(owner, { venue_categories: [] });
    expect(subNames(untouched)).toEqual(['Padel']);
    const alsoUntouched = await step1(owner, { venue_categories: null, venue_category: null });
    expect(subNames(alsoUntouched)).toEqual(['Padel']);
  });

  it('an older app re-saving the SAME primary keeps the categories a newer one added', async () => {
    const owner = newOwner();
    await step1(owner, { venue_categories: [padel, yoga, squash] });

    const resaved = await step1(owner, { venue_category: padel, venue_name: 'Renamed' });
    expect(resaved.venue_name).toBe('Renamed');
    expect(subNames(resaved)).toEqual(['Padel', 'Yoga', 'Squash']);
    expect(resaved.venue_category.sub_category_name).toBe('Padel');
  });

  it('an older app choosing a DIFFERENT single category makes it the only one', async () => {
    const owner = newOwner();
    await step1(owner, { venue_categories: [padel, yoga] });

    const changed = await step1(owner, { venue_category: yoga });
    expect(subNames(changed)).toEqual(['Yoga']);
    expect(changed.venue_category.sub_category_name).toBe('Yoga');
  });
});

describe('step 1 — de-duplication, the cap and validation', () => {
  it('drops a repeated sub category, keeping the first and the order', async () => {
    const out = await step1(newOwner(), { venue_categories: [padel, yoga, padel, { ...yoga }] });
    expect(subNames(out)).toEqual(['Padel', 'Yoga']);
  });

  it('refuses the whole payload when one entry is not a valid triple, and stores nothing', async () => {
    const owner = newOwner();
    await step1(owner, { venue_category: padel });
    const crossed = { ...yoga, sub_category_id: padel.sub_category_id };
    await expect(step1(owner, { venue_categories: [squash, crossed] })).rejects.toThrow(
      'Select a valid sub category under the chosen category'
    );
    await expect(step1(owner, { venue_categories: [{ ...squash, category_id: 'nope' }] })).rejects.toThrow(
      'Venue category selection is invalid'
    );
    expect(subNames((await venueService.getMine(owner))!)).toEqual(['Padel']);
  });

  it(`allows exactly ${VENUE_CATEGORY_LIMIT} categories and refuses one more — counted after de-duplication`, async () => {
    const superCat = await CategoryModel.findById(padel.super_category_id);
    const racquet = await CategoryModel.findById(padel.category_id);
    const many: Triple[] = [];
    for (let i = 0; i < VENUE_CATEGORY_LIMIT + 1; i += 1) {
      const sub = await CategoryModel.create({ name: `Sub ${i}`, slug: `sub-${i}-${oid()}`, level: 'SUB', parent_id: racquet!._id });
      many.push({ super_category_id: String(superCat!._id), category_id: String(racquet!._id), sub_category_id: String(sub._id) });
    }

    const atLimit = many.slice(0, VENUE_CATEGORY_LIMIT);
    const ok = await step1(newOwner(), { venue_categories: [...atLimit, atLimit[0], atLimit[1]] });
    expect(ok.venue_categories).toHaveLength(VENUE_CATEGORY_LIMIT);

    await expect(step1(newOwner(), { venue_categories: many })).rejects.toMatchObject({
      message: `A venue can belong to at most ${VENUE_CATEGORY_LIMIT} categories`,
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('tells clients the cap through the registration config', () => {
    expect(venueService.registrationConfig().category_limit).toBe(VENUE_CATEGORY_LIMIT);
  });
});

describe('admin create / update and the onboarding draft', () => {
  const step2 = { documents: [] };
  const step3 = { owner_name: 'Asha', owner_email: 'asha@example.com', owner_phone: '+919999999999' };

  it('adminCreate takes the list; adminUpdate replaces it and keeps the mirror in step', async () => {
    const created = await venueService.adminCreate({
      ownerUserId: newOwner(),
      step1: { location_id: locId, venue_name: 'Admin Made', venue_categories: [padel, squash] },
      step2,
      step3,
    });
    expect(subNames(created)).toEqual(['Padel', 'Squash']);
    expect(created.venue_category.sub_category_name).toBe('Padel');

    const updated = await venueService.adminUpdate(created.id, {
      step1: { location_id: locId, venue_name: 'Admin Made', venue_categories: [yoga, padel] },
      step2,
      step3,
    });
    expect(subNames(updated)).toEqual(['Yoga', 'Padel']);
    expect(updated.venue_category.sub_category_name).toBe('Yoga');

    // The single-category admin form of an older portal build still works.
    const legacyForm = await venueService.adminUpdate(created.id, {
      step1: { location_id: locId, venue_name: 'Admin Made', venue_category: squash },
      step2,
      step3,
    });
    expect(subNames(legacyForm)).toEqual(['Squash']);
  });

  it('the draft seeded from an approved meeting starts as a one-entry list', async () => {
    const draft = await venueService.createDraftFromApproval({ userId: newOwner(), name: 'Asha', category: yoga });
    expect(subNames(draft)).toEqual(['Yoga']);
    expect(draft.venue_category).toEqual(draft.venue_categories[0]);
  });
});

describe('the mirror the model keeps on every save', () => {
  const base = () => ({ owner_user_id: oid(), venue_name: 'Raw' });

  it('a write of the legacy triple alone becomes a one-entry list', async () => {
    const v = await VenueModel.create({ ...base(), venue_category: stored(padel, PADEL) });
    expect(v.toObject().venue_categories).toEqual([stored(padel, PADEL)]);

    // …and replaces a longer list when only the legacy triple is written later.
    v.venue_categories = [stored(padel, PADEL), stored(yoga, YOGA)];
    await v.save();
    v.venue_category = stored(squash, SQUASH);
    await v.save();
    const doc = await VenueModel.findById(v._id).lean();
    expect(doc?.venue_categories).toEqual([stored(squash, SQUASH)]);
    expect(doc?.venue_category).toEqual(stored(squash, SQUASH));
  });

  it('a write of the list alone re-mirrors the legacy triple from its first entry', async () => {
    const v = await VenueModel.create({ ...base(), venue_categories: [stored(yoga, YOGA), stored(padel, PADEL)] });
    expect(v.toObject().venue_category).toEqual(stored(yoga, YOGA));

    v.venue_categories = [stored(padel, PADEL), stored(yoga, YOGA)];
    await v.save();
    expect((await VenueModel.findById(v._id).lean())?.venue_category).toEqual(stored(padel, PADEL));
  });

  it('when both are written and disagree, the list is the truth', async () => {
    const v = await VenueModel.create({
      ...base(),
      venue_categories: [stored(yoga, YOGA)],
      venue_category: stored(padel, PADEL),
    });
    expect(v.toObject().venue_category).toEqual(stored(yoga, YOGA));
  });

  it('a venue with no category stays empty on both sides', async () => {
    const v = await VenueModel.create(base());
    expect(v.toObject().venue_categories).toEqual([]);
    expect(v.venue_category.sub_category_id).toBeNull();
  });

  it('leaves the categories alone when the document was loaded without them', async () => {
    const v = await VenueModel.create({ ...base(), venue_categories: [stored(yoga, YOGA), stored(padel, PADEL)] });

    // Only the legacy triple is loaded: the list is not "empty", it is unknown.
    const partial = await VenueModel.findById(v._id).select('venue_name venue_category');
    partial!.venue_name = 'Renamed';
    await partial!.save();
    const withoutEither = await VenueModel.findById(v._id).select('description');
    withoutEither!.description = 'New paint';
    await withoutEither!.save();

    const doc = await VenueModel.findById(v._id).lean();
    expect(doc).toMatchObject({ venue_name: 'Renamed', description: 'New paint' });
    expect(doc?.venue_categories).toEqual([stored(yoga, YOGA), stored(padel, PADEL)]);
    expect(doc?.venue_category).toEqual(stored(yoga, YOGA));
  });

  it('an unrelated save does not mark the category as changed', async () => {
    const v = await VenueModel.create({ ...base(), venue_categories: [stored(yoga, YOGA), stored(padel, PADEL)] });
    const loaded = await VenueModel.findById(v._id);
    loaded!.description = 'New paint';
    await loaded!.validate();
    expect(loaded!.modifiedPaths()).toEqual(['description']);
  });
});

describe('a document stored before the list existed', () => {
  /** Straight into the collection: no `venue_categories` field at all. */
  async function insertLegacy(over: Record<string, unknown> = {}) {
    const _id = oid();
    await VenueModel.collection.insertOne({
      _id,
      owner_user_id: oid(),
      venue_name: 'Old Court',
      status: 'APPROVED',
      is_active: true,
      location_id: new Types.ObjectId(locId),
      venue_category: stored(padel, PADEL),
      ...over,
    });
    return _id;
  }

  it('resolves venue_categories as its one legacy category, without being written', async () => {
    const id = await insertLegacy();
    const out = await venueService.getById(String(id));
    expect(subNames(out!)).toEqual(['Padel']);
    expect(out!.venue_category).toEqual(out!.venue_categories[0]);
    expect((await VenueModel.collection.findOne({ _id: id }))?.venue_categories).toBeUndefined();
  });

  it('resolves an empty list when it has no legacy category either', async () => {
    const id = await insertLegacy({ venue_category: undefined });
    expect((await venueService.getById(String(id)))!.venue_categories).toEqual([]);
  });

  it('still matches the public filters, the club auto-match and the admin table filter', async () => {
    const id = String(await insertLegacy());
    const byCategory = await venueService.publicList({ location_id: locId, sub_category_id: padel.sub_category_id });
    expect(byCategory.map((v) => v.id)).toEqual([id]);

    const club = { location_id: locId, super_category_id: padel.super_category_id, category_id: padel.sub_category_id };
    expect((await venueService.findMatchingForClub(club)).map((v) => v.id)).toEqual([id]);
    await expect(venueService.countMatchingForClub(club)).resolves.toBe(1);
    await expect(venueService.matchingIdsForClub(club)).resolves.toEqual([id]);

    const table = await venueService.table({
      filters: [{ field: 'super_category_id', op: 'eq', value: padel.super_category_id }],
    });
    expect(table.rows.map((v) => v.id)).toEqual([id]);
  });

  it('gets its list the first time anything saves it — the two never disagree once stored', async () => {
    const id = await insertLegacy();
    await venueService.reject(String(id), 'Needs a clearer photo');
    const doc = await VenueModel.collection.findOne({ _id: id });
    expect(doc?.venue_categories).toEqual([stored(padel, PADEL)]);
    expect(doc?.venue_category).toEqual(stored(padel, PADEL));
  });
});

describe('matching a venue through ANY of its categories', () => {
  let both: string;
  let yogaOnly: string;

  beforeEach(async () => {
    const live = { status: 'APPROVED', is_active: true, location_id: new Types.ObjectId(locId) };
    // Padel is this venue's SECOND category.
    const a = await VenueModel.create({
      ...live,
      owner_user_id: oid(),
      venue_name: 'Both',
      venue_categories: [stored(yoga, YOGA), stored(padel, PADEL)],
    });
    const b = await VenueModel.create({
      ...live,
      owner_user_id: oid(),
      venue_name: 'Yoga Only',
      venue_categories: [stored(yoga, YOGA)],
    });
    both = String(a._id);
    yogaOnly = String(b._id);
  });

  it('club auto-match: a club in the venue’s second category matches it', async () => {
    const padelClub = { location_id: locId, super_category_id: padel.super_category_id, category_id: padel.sub_category_id };
    expect((await venueService.findMatchingForClub(padelClub)).map((v) => v.id)).toEqual([both]);
    await expect(venueService.countMatchingForClub(padelClub)).resolves.toBe(1);
    await expect(venueService.matchingIdsForClub(padelClub)).resolves.toEqual([both]);

    const yogaClub = { location_id: locId, super_category_id: yoga.super_category_id, category_id: yoga.sub_category_id };
    expect((await venueService.findMatchingForClub(yogaClub)).map((v) => v.id).sort()).toEqual([both, yogaOnly].sort());
  });

  it('club auto-match: the Super and the Sub must sit on the SAME category, never one from each', async () => {
    const crossed = { location_id: locId, super_category_id: yoga.super_category_id, category_id: padel.sub_category_id };
    await expect(venueService.findMatchingForClub(crossed)).resolves.toEqual([]);
    await expect(venueService.countMatchingForClub(crossed)).resolves.toBe(0);
  });

  it('public filters: any level of any category, alone or together with a search', async () => {
    const names = async (criteria: Parameters<typeof venueService.publicList>[0]) =>
      (await venueService.publicList(criteria)).map((v) => v.venue_name).sort();

    expect(await names({ sub_category_id: padel.sub_category_id })).toEqual(['Both']);
    expect(await names({ super_category_id: padel.super_category_id })).toEqual(['Both']);
    expect(await names({ category_id: yoga.category_id })).toEqual(['Both', 'Yoga Only']);
    expect(await names({ category_id: yoga.category_id, search: 'only' })).toEqual(['Yoga Only']);
    expect(await names({ sub_category_id: squash.sub_category_id })).toEqual([]);
    // Levels from two different categories of one venue do not add up to a match.
    expect(await names({ super_category_id: yoga.super_category_id, sub_category_id: padel.sub_category_id })).toEqual([]);
    // An id that is not an id is ignored, as before.
    expect(await names({ sub_category_id: 'nope', search: 'both' })).toEqual(['Both']);
  });

  it('admin table: the category filters look at every category, the sort at the primary', async () => {
    const rows = async (query: Parameters<typeof venueService.table>[0]) =>
      (await venueService.table(query)).rows.map((v) => v.venue_name);

    expect(await rows({ filters: [{ field: 'venue_category', op: 'contains', value: 'racq' }] })).toEqual(['Both']);
    expect(await rows({ filters: [{ field: 'super_category_id', op: 'eq', value: padel.super_category_id }] })).toEqual(['Both']);
    expect(
      (await rows({ filters: [{ field: 'super_category_id', op: 'in', values: [yoga.super_category_id] }] })).sort()
    ).toEqual(['Both', 'Yoga Only']);
    // Combined with a search, both conditions hold.
    expect(
      await rows({ search: 'only', filters: [{ field: 'venue_category', op: 'contains', value: 'mind' }] })
    ).toEqual(['Yoga Only']);
  });
});
