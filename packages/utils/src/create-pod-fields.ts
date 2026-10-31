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
