import type { Types } from 'mongoose';

/**
 * A venue's categories, read the one way everything reads them.
 *
 * A venue used to carry exactly one Super → Category → Sub triple in
 * `venue_category`; it now carries a list in `venue_categories`, and the old
 * field stays as the mirror of the list's first entry so released apps keep
 * working. A document written before the list existed has only the old field
 * until `migrate:venue-categories` has run — so every reader goes through this
 * file, which treats that lone triple as a one-entry list. Nothing here imports
 * the model: the model itself keeps the mirror with these helpers.
 */

type CategoryId = Types.ObjectId | string;

const LEVELS = ['super_category_id', 'category_id', 'sub_category_id'] as const;
const NAMES = ['super_category_name', 'category_name', 'sub_category_name'] as const;

export type VenueCategoryLevel = (typeof LEVELS)[number];

/** The triple as a stored subdocument, a lean row or a pub copy all carry it. */
export interface VenueCategoryRef<I extends CategoryId = CategoryId> {
  super_category_id?: I | null;
  category_id?: I | null;
  sub_category_id?: I | null;
  super_category_name?: string;
  category_name?: string;
  sub_category_name?: string;
}

/** Anything that may hold the list, the legacy triple, or both. */
export interface VenueCategoryCarrier<T extends VenueCategoryRef = VenueCategoryRef> {
  venue_categories?: readonly T[] | null;
  venue_category?: T | null;
}

/** The db paths a triple lives at: the list first, then the legacy single. */
export const VENUE_CATEGORY_PATHS = ['venue_categories', 'venue_category'] as const;

/** False for the empty subdocument every venue is created with. */
export const hasVenueCategory = (category?: VenueCategoryRef | null): boolean =>
  !!category && (LEVELS.some((level) => category[level]) || NAMES.some((name) => category[name]));

/** A plain copy of the six fields — never a live subdocument of another path. */
export const pickVenueCategory = <I extends CategoryId>(category: VenueCategoryRef<I>) => ({
  super_category_id: category.super_category_id ?? null,
  category_id: category.category_id ?? null,
  sub_category_id: category.sub_category_id ?? null,
  super_category_name: category.super_category_name ?? '',
  category_name: category.category_name ?? '',
  sub_category_name: category.sub_category_name ?? '',
});

/** Identity of a whole triple, names included — what "the mirror is in step" compares. */
export const venueCategoryKey = (category?: VenueCategoryRef | null): string =>
  category ? Object.values(pickVenueCategory(category)).map(String).join('|') : '';

/**
 * Every category the venue belongs to, primary first: the list when it has
 * one, else the legacy triple of a document not yet migrated, else nothing.
 */
export function venueCategoriesOf<T extends VenueCategoryRef>(
  venue?: VenueCategoryCarrier<T> | null
): T[] {
  const list = venue?.venue_categories ?? [];
  if (list.length > 0) return [...list];
  const legacy = venue?.venue_category;
  return legacy && hasVenueCategory(legacy) ? [legacy] : [];
}

/** First entry per sub category wins; an entry with no sub category is kept as is. */
export function dedupeVenueCategories<T extends VenueCategoryRef>(categories: readonly T[]): T[] {
  const seen = new Set<string>();
  return categories.filter((category) => {
    if (!category.sub_category_id) return true;
    const key = String(category.sub_category_id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The distinct sub categories the venue hosts, primary first. */
export function venueSubCategoryIds<I extends CategoryId>(
  venue?: VenueCategoryCarrier<{ sub_category_id?: I | null }> | null
): I[] {
  const ids = new Map<string, I>();
  for (const category of venueCategoriesOf(venue)) {
    const id = category.sub_category_id;
    if (id && !ids.has(String(id))) ids.set(String(id), id);
  }
  return [...ids.values()];
}

/** Does ANY of the venue's categories carry this sub category? */
export const venueHostsSubCategory = (
  venue: VenueCategoryCarrier | null | undefined,
  subCategoryId?: CategoryId | null
): boolean =>
  !!subCategoryId && venueSubCategoryIds(venue).some((id) => String(id) === String(subCategoryId));

/**
 * Mongo fragment: venues with ONE category carrying every given level — on the
 * list (`$elemMatch`, so a Super from one entry never pairs with a Sub from
 * another) or on the legacy triple of a document not yet migrated. Empty when
 * no level is given, so it can be spread into any filter.
 */
export function venueCategoryMatch(
  levels: Partial<Record<VenueCategoryLevel, Types.ObjectId | null>>
): Record<string, unknown> {
  const wanted = LEVELS.filter((level) => levels[level]).map((level) => [level, levels[level]] as const);
  if (wanted.length === 0) return {};
  return {
    $or: [
      { venue_categories: { $elemMatch: Object.fromEntries(wanted) } },
      Object.fromEntries(wanted.map(([level, id]) => [`venue_category.${level}`, id])),
    ],
  };
}

type PickedVenueCategory<I extends CategoryId> = ReturnType<typeof pickVenueCategory<I>>;

/** What `migrate:venue-categories` does to one stored venue. */
export type VenueCategoryBackfill<I extends CategoryId> =
  | { action: 'skip' }
  /** No list yet: the legacy triple becomes its one entry. */
  | { action: 'fill'; venue_categories: PickedVenueCategory<I>[] }
  /** The legacy triple drifted from the list's first entry: re-mirror it. */
  | { action: 'mirror'; venue_category: PickedVenueCategory<I> };

/**
 * The backfill decision for one raw venue document — pure, so a dry run and a
 * real run can never disagree. Idempotent by construction: a document this has
 * already fixed plans `skip`.
 */
export function planVenueCategoryBackfill<I extends CategoryId>(
  venue: VenueCategoryCarrier<VenueCategoryRef<I>>
): VenueCategoryBackfill<I> {
  const list = venue.venue_categories ?? [];
  const legacy = venue.venue_category;
  if (list.length > 0) {
    return venueCategoryKey(list[0]) === venueCategoryKey(legacy)
      ? { action: 'skip' }
      : { action: 'mirror', venue_category: pickVenueCategory(list[0]) };
  }
  if (legacy && hasVenueCategory(legacy)) {
    return { action: 'fill', venue_categories: [pickVenueCategory(legacy)] };
  }
  return { action: 'skip' };
}
