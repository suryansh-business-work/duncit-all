/**
 * The pod product picker's derivations — search, brand/stock filtering, sorting
 * and facets — with no framework in them.
 *
 * The picker itself is rendered four times over (Tamagui in the native app, MUI
 * in mWeb and in @duncit/pod-form for the admin and Club Admin portals) because
 * the toolkits cannot be shared. What each of those renders is decided HERE, so
 * a host searching from their phone and an admin searching from the portal get
 * the same list in the same order (rules 27 + 40).
 *
 * The catalogue handed in is already narrowed to the pod's Super + Sub category
 * by `filterProductsForClub` — everything below narrows further WITHIN that set.
 */

/** The catalogue fields the picker reads. Structural on purpose: each surface
 * hands in its own generated GraphQL row, and they differ in what else they
 * select. */
export interface PodPickerProduct {
  id: string;
  product_name: string;
  unit_cost: number;
  available_count: number;
  brand_name?: string | null;
  sku?: string | null;
  short_description?: string | null;
  description?: string | null;
  image_url?: string | null;
  images?: readonly string[] | null;
  unit_type?: string | null;
  weight_volume?: string | null;
  tags?: readonly string[] | null;
}

export type PodProductSort = 'NAME' | 'PRICE_LOW' | 'PRICE_HIGH' | 'STOCK';

/** Every sort the picker offers, with the catalogue key naming each one. The
 * order here is the order the surfaces render. */
export const POD_PRODUCT_SORTS: ReadonlyArray<{ value: PodProductSort; labelKey: string }> = [
  { value: 'NAME', labelKey: 'podProduct.sortName' },
  { value: 'PRICE_LOW', labelKey: 'podProduct.sortPriceLow' },
  { value: 'PRICE_HIGH', labelKey: 'podProduct.sortPriceHigh' },
  { value: 'STOCK', labelKey: 'podProduct.sortStock' },
];

export interface PodProductCriteria {
  /** Free text over name, brand and SKU. */
  search: string;
  /** Empty string = every brand. */
  brand: string;
  /** Hide anything with no units left. */
  inStockOnly: boolean;
  sort: PodProductSort;
}

export const BLANK_POD_PRODUCT_CRITERIA: PodProductCriteria = {
  search: '',
  brand: '',
  inStockOnly: false,
  sort: 'NAME',
};

/** How many filters the host has moved off their default — drives the "N active"
 * badge, so the sort's default (NAME) deliberately does not count. */
export function podProductActiveFilterCount(criteria: PodProductCriteria): number {
  return (
    (criteria.search.trim() ? 1 : 0) +
    (criteria.brand ? 1 : 0) +
    (criteria.inStockOnly ? 1 : 0) +
    (criteria.sort === 'NAME' ? 0 : 1)
  );
}

/** The brands present in this pod's eligible catalogue, sorted, deduplicated and
 * blank-free — the only brands worth offering as a filter. */
export function podProductBrands(products: readonly PodPickerProduct[]): string[] {
  const names = new Set<string>();
  for (const product of products) {
    const name = product.brand_name?.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Units this product still has. Never negative, so an over-sold row reads as 0
 * rather than pushing a negative into the quantity clamp. */
export function podProductStock(product: PodPickerProduct | null | undefined): number {
  return Math.max(0, Number(product?.available_count) || 0);
}

function matchesSearch(product: PodPickerProduct, term: string): boolean {
  if (!term) return true;
  const haystack = [product.product_name, product.brand_name, product.sku]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

const comparators: Record<PodProductSort, (a: PodPickerProduct, b: PodPickerProduct) => number> = {
  NAME: (a, b) => a.product_name.localeCompare(b.product_name),
  PRICE_LOW: (a, b) => a.unit_cost - b.unit_cost,
  PRICE_HIGH: (a, b) => b.unit_cost - a.unit_cost,
  STOCK: (a, b) => podProductStock(b) - podProductStock(a),
};

/**
 * Apply the picker's criteria to the pod's eligible catalogue.
 *
 * `alreadyAdded` ids are NOT dropped — the surfaces render them as a disabled
 * "Added" card. Hiding them instead made a host search for a product they had
 * already attached and conclude the category no longer carried it.
 *
 * The caller's catalogue is never mutated — `.filter()` already hands back a
 * fresh array, so the `.sort()` below only ever reorders that copy. (Spelled
 * this way rather than `toSorted()`: this file also runs under Hermes, and
 * @duncit/utils targets ES2020.)
 */
export function filterPodProducts(
  products: readonly PodPickerProduct[],
  criteria: PodProductCriteria
): PodPickerProduct[] {
  const term = criteria.search.trim().toLowerCase();
  const brand = criteria.brand.trim();
  const kept = products.filter((product) => {
    if (brand && product.brand_name?.trim() !== brand) return false;
    if (criteria.inStockOnly && podProductStock(product) <= 0) return false;
    return matchesSearch(product, term);
  });
  kept.sort(comparators[criteria.sort]);
  return kept;
}

/**
 * Hold a quantity inside what the product can actually supply: at least 1, at
 * most its remaining stock. A product with no stock still clamps to 1 so the
 * stepper never shows 0 — the surfaces block adding it on `podProductStock`
 * instead, which is a clearer failure than a silently un-incrementable field.
 */
export function clampPodProductQty(quantity: number, product: PodPickerProduct | null): number {
  const stock = podProductStock(product);
  const whole = Math.floor(Number(quantity) || 0);
  const ceiling = stock > 0 ? stock : Number.POSITIVE_INFINITY;
  return Math.min(Math.max(whole, 1), ceiling);
}

/** Line cost of one picked product at the chosen quantity. */
export function podProductLineTotal(
  product: PodPickerProduct | null,
  quantity: number
): number {
  if (!product) return 0;
  return product.unit_cost * (Number(quantity) || 0);
}

/** Cost of every attached row, priced against the catalogue. Rows whose product
 * has since left the catalogue contribute 0 rather than breaking the total. */
export function podProductRequestsTotal(
  requests: ReadonlyArray<{ product_id: string; quantity: number }>,
  products: readonly PodPickerProduct[]
): number {
  const byId = new Map(products.map((product) => [String(product.id), product]));
  return requests.reduce(
    (sum, row) => sum + podProductLineTotal(byId.get(String(row.product_id)) ?? null, row.quantity),
    0
  );
}

/** The first usable image for a product card, or null when it ships none — the
 * surfaces render their own placeholder rather than a broken <img>. */
export function podProductImage(product: PodPickerProduct | null | undefined): string | null {
  const direct = product?.image_url?.trim();
  if (direct) return direct;
  const first = product?.images?.find((url) => url?.trim());
  return first?.trim() ?? null;
}

/** The blurb a card shows under the name: the short description when the
 * catalogue has one, else the long one, else nothing. */
export function podProductBlurb(product: PodPickerProduct | null | undefined): string {
  return product?.short_description?.trim() || product?.description?.trim() || '';
}
