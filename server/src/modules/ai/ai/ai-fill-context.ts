import { Types } from 'mongoose';

/**
 * The bridge between an AI fill and the REAL platform data.
 *
 * A fill used to ask the model for a category, a city and a club "by name" and
 * then look each name up. The model has no way of knowing what this platform
 * actually holds, so it answered with plausible inventions ("Sports & Fitness",
 * "Bengaluru") that matched nothing — and every field behind a lookup came back
 * empty. That is what made a fill read as half-done.
 *
 * So the lists are handed to the model first (`buildFillReference`) and the
 * answer is resolved against the same collections afterwards
 * (`resolveClubReferences`). It picks from a closed set, and what it picks
 * exists.
 */

/** How much of the platform is worth spending prompt tokens on. */
const MAX_SUPERS = 15;
const MAX_SUBS_PER_SUPER = 15;
const MAX_LOCATIONS = 25;
const MAX_ZONES_PER_LOCATION = 10;
const MAX_CLUBS = 40;

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Case-insensitive exact-name match, anchored, with regex metacharacters
 * escaped — a club called "C++ Devs" must not compile as a pattern. */
const ESCAPE_REPLACEMENT = String.raw`\$&`;
const nameRx = (name: string) =>
  new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, ESCAPE_REPLACEMENT)}$`, 'i');

const line = (name: string, values: string[], empty: string) =>
  `- ${name}: ${values.join(', ') || empty}`;

/** "Super category: sub, sub, …" for every active super category. The middle
 * CATEGORY level is a navigation step the club does not store, so it is walked
 * through rather than listed. */
async function categoryLines(): Promise<string[]> {
  const { CategoryModel } = await import('@modules/pods/category/category.model');
  const docs: any[] = await CategoryModel.find({ is_active: true })
    .select('_id name level parent_id')
    .lean();
  const parentOf = new Map(docs.map((doc) => [String(doc._id), String(doc.parent_id ?? '')]));
  const subsBySuper = new Map<string, string[]>();
  for (const sub of docs.filter((doc) => doc.level === 'SUB')) {
    const superId = parentOf.get(parentOf.get(String(sub._id)) ?? '') ?? '';
    if (!superId) continue;
    const list = subsBySuper.get(superId) ?? [];
    if (list.length < MAX_SUBS_PER_SUPER) list.push(sub.name);
    subsBySuper.set(superId, list);
  }
  return docs
    .filter((doc) => doc.level === 'SUPER')
    .slice(0, MAX_SUPERS)
    .map((doc) => line(doc.name, subsBySuper.get(String(doc._id)) ?? [], '(no sub categories)'));
}

/** "City: locality, locality, …" for every location the admin has set up. */
async function locationLines(): Promise<string[]> {
  const { LocationModel } = await import('@modules/platform/location/location.model');
  const docs: any[] = await LocationModel.find({})
    .select('location_name location_zones')
    .limit(MAX_LOCATIONS)
    .lean();
  return docs.map((doc) =>
    line(
      doc.location_name,
      (doc.location_zones ?? []).slice(0, MAX_ZONES_PER_LOCATION).map((zone: any) => zone.zone_name),
      '(no localities)'
    )
  );
}

/** The clubs a pod can actually be attached to. */
async function clubNames(): Promise<string[]> {
  const { ClubModel } = await import('@modules/clubs/club/club.model');
  const docs: any[] = await ClubModel.find({ is_active: true })
    .select('club_name')
    .limit(MAX_CLUBS)
    .lean();
  return docs.map((doc) => `- ${doc.club_name}`);
}

/**
 * The real names the model must choose from, appended to the fill request.
 * Empty for an entity that has nothing to look up (inventory products invent
 * their own brand and vendor).
 */
export async function buildFillReference(entity: string): Promise<string> {
  if (entity === 'CLUB') {
    const [categories, locations] = await Promise.all([categoryLines(), locationLines()]);
    return [
      'Reference data — the real categories and cities on this platform.',
      'Answer super_category, sub_category, city and locality with values copied EXACTLY from these lists (a sub category must be one listed under the super category you chose); anything else is discarded and leaves the field empty.',
      'Categories:',
      categories.join('\n'),
      'Cities:',
      locations.join('\n'),
    ].join('\n');
  }
  if (entity === 'POD') {
    const clubs = await clubNames();
    return [
      'Reference data — the real clubs on this platform.',
      'Answer club_name with one copied EXACTLY from this list, and write the pod so it suits that club.',
      clubs.join('\n'),
    ].join('\n');
  }
  return '';
}

/** The SUB category with this name that belongs to `superId`.
 *
 * A club stores Super + Sub, and the cascade picker only lists the subs sitting
 * under the chosen super — a pair taken from two different supers renders as an
 * EMPTY Category field, so a sub that does not belong is no match at all. */
async function findSub(CategoryModel: any, name: string, superId: string) {
  const subs: any[] = await CategoryModel.find({ name: nameRx(name), level: 'SUB' })
    .select('_id parent_id')
    .lean();
  if (subs.length === 0) return null;
  if (!superId) return subs[0];
  const middles: any[] = await CategoryModel.find({
    parent_id: new Types.ObjectId(superId),
    level: 'CATEGORY',
  })
    .select('_id')
    .lean();
  const middleIds = new Set(middles.map((doc) => String(doc._id)));
  return subs.find((sub) => middleIds.has(String(sub.parent_id))) ?? null;
}

/** Super + Sub, always a pair the picker can render. */
async function resolveCategory(parsed: any): Promise<void> {
  const { CategoryModel } = await import('@modules/pods/category/category.model');
  const superName = text(parsed.super_category);
  const subName = text(parsed.sub_category);

  const superDoc = superName
    ? await CategoryModel.findOne({ name: nameRx(superName), level: 'SUPER' }).select('_id').lean()
    : null;
  if (superDoc) parsed.super_category_id = String((superDoc as any)._id);
  if (!subName) return;

  const sub = await findSub(CategoryModel, subName, superDoc ? String((superDoc as any)._id) : '');
  if (!sub) return;
  parsed.category_id = String(sub._id);
  if (superDoc) return;

  // The super was named wrong (or not at all) but the sub was found: take the
  // super the sub actually hangs under, rather than leaving the pair broken.
  const middle: any = await CategoryModel.findById(sub.parent_id).select('parent_id').lean();
  if (middle?.parent_id) parsed.super_category_id = String(middle.parent_id);
}

/** City + a locality the city really lists. */
async function resolveLocation(parsed: any): Promise<void> {
  const cityName = text(parsed.city);
  if (!cityName) return;
  const { LocationModel } = await import('@modules/platform/location/location.model');
  const loc: any = await LocationModel.findOne({ location_name: nameRx(cityName) })
    .select('_id location_zones')
    .lean();
  if (!loc) return;
  parsed.location_id = String(loc._id);

  // The locality drives the venue auto-match, so an invented one matches no
  // venues — and a blank one leaves the club matching the whole city. Take the
  // named zone when the city lists it, else its first.
  const zones: any[] = loc.location_zones ?? [];
  const wanted = text(parsed.locality).toLowerCase();
  const zone = zones.find((item) => String(item?.zone_name ?? '').toLowerCase() === wanted);
  parsed.locality = String((zone ?? zones[0])?.zone_name ?? '');
}

/** The one user who will administer the club. */
async function resolveClubAdmin(parsed: any): Promise<void> {
  const { ClubAdminProfileModel } = await import(
    '@modules/clubs/clubAdminProfile/clubAdminProfile.model'
  );
  const email = text(parsed.club_admin_email);
  if (email) {
    // Only an APPROVED, active Club Admin can be handed a club — the same rule
    // the form's own picker applies.
    const admin: any = await ClubAdminProfileModel.findOne({
      email: nameRx(email),
      status: 'APPROVED',
      is_active: true,
    })
      .select('user_id')
      .lean();
    if (admin) {
      parsed.admin_user_ids = [String(admin.user_id)];
      return;
    }
  }

  // The model cannot know real people, so an address it invents never matches.
  // The club form REQUIRES an admin and offers only those approved under the
  // club's own category, so the fill takes the first entry of exactly that list
  // — the same one the picker puts on top.
  const { clubAdminProfileService } = await import(
    '@modules/clubs/clubAdminProfile/clubAdminProfile.service'
  );
  const [first] = await clubAdminProfileService.candidatesForClub({
    super_category_id: text(parsed.super_category_id) || null,
    sub_category_id: text(parsed.category_id) || null,
  });
  if (first) parsed.admin_user_ids = [first.user_id];
}

/**
 * Turn the NAMES the model answered with into the ids the club form binds.
 *
 * Anything that still does not match is dropped rather than guessed: what
 * arrives at the client is either a real id or nothing, and nothing means "keep
 * what the admin already chose".
 */
export async function resolveClubReferences(parsed: any): Promise<void> {
  await resolveCategory(parsed);
  await resolveLocation(parsed);
  await resolveClubAdmin(parsed);
}
