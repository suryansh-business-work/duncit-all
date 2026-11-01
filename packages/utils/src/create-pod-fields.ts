/**
 * What Create Pod's steps show, shared by mWeb and the native app (rules 29 + 56):
 * the What step's category tiles, and when a step's folded "More options" opens.
 */

/** One of the host's onboarded categories, as the Create Pod options query returns it. */
export interface CreatePodCategorySource {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
}

/** A category's admin-set icon (image URL, icon name or emoji). */
export interface CreatePodCategoryIconSource {
  id: string;
  icon?: string | null;
}

/** One super-category the host is onboarded under — "For You", "For Your Pet". */
export interface CreatePodSuperOption {
  id: string;
  name: string;
}

export const superCategoryIdOf = (category: Readonly<CreatePodCategorySource>): string =>
  category.super_category_id ?? '';

/** The host's super-categories, in the order their categories come. */
export function createPodSuperOptions(categories: readonly CreatePodCategorySource[]): CreatePodSuperOption[] {
  const seen = new Map<string, string>();
  for (const category of categories) {
    const id = superCategoryIdOf(category);
    if (!seen.has(id)) seen.set(id, category.super_category_name);
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}

/** A Category Management row, as the Create Pod options query reads it. */
export interface CreatePodCatalogCategory {
  id: string;
  name: string;
  parent_id?: string | null;
  is_active?: boolean | null;
}

/** A row's place in the tree: its super's, its category's and its own position. */
type TreeRank = readonly [number, number, number];

const byTreeRank = (a: TreeRank, b: TreeRank) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

const activeOnly = (rows: readonly CreatePodCatalogCategory[]) => rows.filter((row) => row.is_active !== false);

/** Every active Super > Category > Sub the platform offers, as picker rows in
 * the order Category Management sorts them. A sub whose parent chain is inactive
 * or missing is left out — a pod cannot be run in it. */
export function createPodCatalogRows(
  supers: readonly CreatePodCatalogCategory[],
  categories: readonly CreatePodCatalogCategory[],
  subs: readonly CreatePodCatalogCategory[],
): CreatePodCategorySource[] {
  const superRank = new Map(activeOnly(supers).map((row, index) => [row.id, { row, index }]));
  const categoryRank = new Map(activeOnly(categories).map((row, index) => [row.id, { row, index }]));
  const ranked = activeOnly(subs).flatMap((sub, index) => {
    const category = categoryRank.get(sub.parent_id ?? '');
    const owner = category && superRank.get(category.row.parent_id ?? '');
    if (!category || !owner) return [];
    const rank: TreeRank = [owner.index, category.index, index];
    const row: CreatePodCategorySource = {
      super_category_id: owner.row.id,
      category_id: category.row.id,
      sub_category_id: sub.id,
      super_category_name: owner.row.name,
      category_name: category.row.name,
      sub_category_name: sub.name,
    };
    return [{ rank, row }];
  });
  return ranked.sort((a, b) => byTreeRank(a.rank, b.rank)).map((entry) => entry.row);
}

/** The catalog rows a host is granted. A grant names a Sub, or a whole Category
 * (no sub) or a whole Super (no category) — those cover every sub beneath them.
 * Without a catalog the grants are listed as they are. */
export function createPodGrantedRows<C extends CreatePodCategorySource>(
  catalog: readonly C[],
  granted: readonly CreatePodCategorySource[],
): Array<C | CreatePodCategorySource> {
  if (catalog.length === 0) return [...granted];
  const covers = (grant: CreatePodCategorySource, row: C) => {
    if (!grant.super_category_id || grant.super_category_id !== row.super_category_id) return false;
    if (grant.sub_category_id) return grant.sub_category_id === row.sub_category_id;
    return !grant.category_id || grant.category_id === row.category_id;
  };
  return catalog.filter((row) => granted.some((grant) => covers(grant, row)));
}

/** The categories under one super, each once, in the order their rows come. */
export function createPodGroupOptions(categories: readonly CreatePodCategorySource[], superId: string): CreatePodSuperOption[] {
  const seen = new Map<string, string>();
  for (const category of categories) {
    if (superCategoryIdOf(category) !== superId) continue;
    const id = category.category_id ?? '';
    if (!seen.has(id)) seen.set(id, category.category_name);
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}

/** The rows under one category. */
export const categoriesForGroup = <C extends CreatePodCategorySource>(categories: readonly C[], categoryId: string): C[] =>
  categories.filter((category) => (category.category_id ?? '') === categoryId);

/** What the three-level picker shows for a Super + Category pick. A pick that
 * is no longer offered falls back to the first option of its level. */
export function createPodCategoryLevels<C extends CreatePodCategorySource>(
  rows: readonly C[],
  pick: Readonly<{ superId: string; categoryId: string }>,
) {
  const supers = createPodSuperOptions(rows);
  const superId = supers.some((option) => option.id === pick.superId) ? pick.superId : (supers[0]?.id ?? '');
  const groups = createPodGroupOptions(rows, superId);
  const categoryId = groups.some((option) => option.id === pick.categoryId) ? pick.categoryId : (groups[0]?.id ?? '');
  const subs = categoriesForGroup(
    rows.filter((row) => superCategoryIdOf(row) === superId),
    categoryId,
  );
  return { supers, superId, groups, categoryId, subs };
}

/** The tiles a super filter shows: the picked super's, or every one when there is nothing to narrow. */
export const categoriesForSuper = <C extends CreatePodCategorySource>(
  categories: readonly C[],
  superCount: number,
  superId: string,
): C[] => (superCount > 1 ? categories.filter((category) => superCategoryIdOf(category) === superId) : [...categories]);

/** A tile's name: the most specific level the host was onboarded at. */
export const categoryTileName = (category: Readonly<CreatePodCategorySource>): string =>
  category.sub_category_name || category.category_name || category.super_category_name;

/** The level above the name, so two "Wellness" tiles still read apart. */
export const categoryTileGroup = (category: Readonly<CreatePodCategorySource>): string =>
  category.sub_category_name ? category.category_name || category.super_category_name : category.super_category_name;

/** A tile's icon: its own level's, else its parent category's, else none. */
export function categoryIconLookup(icons: readonly CreatePodCategoryIconSource[]) {
  const byId = new Map(icons.map((entry) => [entry.id, entry.icon ?? '']));
  return (category: Readonly<CreatePodCategorySource>): string =>
    byId.get(category.sub_category_id ?? '') || byId.get(category.category_id ?? '') || '';
}

/** Money's folded extras — early-bird prices, Smart Incentive, payment terms, place charges, products. */
export const MONEY_EXTRA_FIELDS = ['ticket_discount_tiers', 'smart_incentive_pct', 'payment_terms', 'place_charges', 'product_requests'] as const;

/** Details' folded extras — hashtags, more info, perks, the reel. */
export const DETAILS_EXTRA_FIELDS = ['pod_hashtag_text', 'pod_info', 'available_perks', 'reel_url'] as const;

export interface MoneyExtrasSource {
  ticket_discount_enabled: boolean;
  smart_incentive_enabled: boolean;
  payment_terms: string;
  place_charges: readonly unknown[];
  product_requests: readonly unknown[];
}

export interface DetailsExtrasSource {
  pod_hashtag_text: string;
  pod_info: string;
  available_perks: readonly unknown[];
  reel_url: string;
}

/** Money's More options opens on arrival when the host already set one of its extras. */
export const moneyExtrasFilled = (values: Readonly<MoneyExtrasSource>): boolean =>
  values.ticket_discount_enabled ||
  values.smart_incentive_enabled ||
  values.payment_terms.trim().length > 0 ||
  values.place_charges.length > 0 ||
  values.product_requests.length > 0;

/** Details' More options opens on arrival when the host already filled one of its extras. */
export const detailsExtrasFilled = (values: Readonly<DetailsExtrasSource>): boolean =>
  values.pod_hashtag_text.trim().length > 0 ||
  values.pod_info.trim().length > 0 ||
  values.available_perks.length > 0 ||
  values.reel_url.trim().length > 0;

/** Whether any of `fields` holds a validation error — a folded section is then held open. */
export const anyFieldFailed = (errors: Readonly<Record<string, unknown>>, fields: readonly string[]): boolean =>
  fields.some((field) => Boolean(errors[field]));
