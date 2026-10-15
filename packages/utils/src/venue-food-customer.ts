/**
 * What a guest does around a venue's menu besides ordering — one contract for
 * mWeb and the native app: finding a dish (search, collapsible sections), a
 * dish's own page, the venue's food rating, and "Your Food Orders".
 *
 * Framework-free like `venue-food`: the documents travel as plain strings and
 * every user-facing sentence is a literal key the caller translates.
 */

import type { FoodMenuGroup, VenueFoodItem, VenueFoodOrder, VenueFoodOrderLine } from './venue-food';
import type { FoodOwnerTranslate } from './venue-food-owner';

// ---------------------------------------------------------------------------
// Menu search and sections
// ---------------------------------------------------------------------------

/** What a menu browser shows for a search and its folded sections — one decision for mWeb and the app. */
export interface FoodMenuView {
  shown: FoodMenuGroup[];
  sectioned: boolean;
  allOpen: boolean;
}

export function foodMenuView(
  groups: ReadonlyArray<FoodMenuGroup>,
  query: string,
  collapsed: ReadonlyArray<string>,
): FoodMenuView {
  const shown = filterFoodMenuGroups(groups, query);
  return { shown, sectioned: foodMenuHasSections(groups), allOpen: allFoodSectionsOpen(shown, collapsed) };
}

/** The words of a search, lower-cased; none for an empty or blank one. */
export const foodSearchTerms = (query: string | null | undefined): string[] =>
  (query ?? '').toLowerCase().split(/\s+/).filter(Boolean);

/** A dish matches when every word of the search is in its name or its description. */
export function foodItemMatches(item: Pick<VenueFoodItem, 'name' | 'description'>, terms: readonly string[]): boolean {
  const haystack = `${item.name ?? ''} ${item.description ?? ''}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

/** The menu's sections cut down to the dishes a search matches; a section left empty goes. */
export function filterFoodMenuGroups(groups: ReadonlyArray<FoodMenuGroup>, query: string | null | undefined): FoodMenuGroup[] {
  const terms = foodSearchTerms(query);
  if (terms.length === 0) return [...groups];
  return groups.flatMap((group) => {
    const items = group.items.filter((item) => foodItemMatches(item, terms));
    return items.length ? [{ category: group.category, items }] : [];
  });
}

/**
 * Whether the menu is worth folding: only a menu with at least one named
 * category is. A menu of uncategorised dishes is one plain list — an
 * accordion with a single nameless section would only be in the way.
 */
export const foodMenuHasSections = (groups: ReadonlyArray<FoodMenuGroup>): boolean =>
  groups.some((group) => group.category !== '');

/** A section's key in the collapsed list — its category; '' is the uncategorised dishes. */
export const foodSectionKey = (group: Pick<FoodMenuGroup, 'category'>): string => group.category;

/** The key of the heading the uncategorised dishes get once the menu is folded into sections. */
export const FOOD_OTHER_SECTION_KEY = 'mweb.venueFood.menuSearch.otherSection';

/** A section is open unless the guest folded it. */
export const isFoodSectionOpen = (key: string, collapsed: ReadonlyArray<string>): boolean => !collapsed.includes(key);

/**
 * The folded sections once the search text changes: a search that has words
 * opens every section, so a match is never hidden in a folded one; clearing
 * the search leaves the sections as they are.
 */
export const foodSectionsAfterSearch = (collapsed: ReadonlyArray<string>, query: string): string[] =>
  foodSearchTerms(query).length > 0 ? [] : [...collapsed];

/** Fold an open section, or open a folded one. */
export const toggleFoodSection = (collapsed: ReadonlyArray<string>, key: string): string[] =>
  collapsed.includes(key) ? collapsed.filter((entry) => entry !== key) : [...collapsed, key];

/** Every section of the menu is open — the button then offers "Collapse all", otherwise "Expand all". */
export const allFoodSectionsOpen = (groups: ReadonlyArray<FoodMenuGroup>, collapsed: ReadonlyArray<string>): boolean =>
  groups.every((group) => !collapsed.includes(foodSectionKey(group)));

/** The collapsed list after the Expand all / Collapse all button. */
export const toggleAllFoodSections = (groups: ReadonlyArray<FoodMenuGroup>, collapsed: ReadonlyArray<string>): string[] =>
  allFoodSectionsOpen(groups, collapsed) ? groups.map(foodSectionKey) : [];

/** The one dish a page is about, or null when it is not (or no longer) on the menu. */
export const findFoodItem = (menu: ReadonlyArray<VenueFoodItem>, itemId: string): VenueFoodItem | null =>
  menu.find((item) => item.id === itemId) ?? null;

/** A dish's own page. Public like the menu. */
export const venueFoodItemPath = (venueId: string, itemId: string): string =>
  `/venue/${encodeURIComponent(venueId)}/food/${encodeURIComponent(itemId)}`;

/** "Your Food Orders". */
export const MY_FOOD_ORDERS_PATH = '/food-orders';

// ---------------------------------------------------------------------------
// The venue's food rating
// ---------------------------------------------------------------------------

/** One rating per served order — the venue's food rating, not a dish's. */
export interface VenueFoodRating {
  venue_id: string;
  /** 0 when nobody has rated yet; otherwise 1.0 to 5.0. */
  average: number;
  count: number;
}

/** Public: a venue's food rating. Asked on its own, so the server's response cache can hold it. */
export const VENUE_FOOD_RATING_QUERY = /* GraphQL */ `
  query VenueFoodRating($venueId: ID!) {
    venueFoodRating(venue_id: $venueId) {
      venue_id
      average
      count
    }
  }
`;

/** Shown only once somebody has rated — "no rating yet" is not a score of zero. */
export const hasFoodRating = (rating: Pick<VenueFoodRating, 'count'> | null | undefined): rating is VenueFoodRating =>
  !!rating && rating.count > 0;

/** The average as the stars beside it read: one decimal. */
export const formatFoodRating = (average: number): string => (Math.round(average * 10) / 10).toFixed(1);

// ---------------------------------------------------------------------------
// Your Food Orders
// ---------------------------------------------------------------------------

/** Mirrors the server enum MyVenueFoodOrderScope. */
export type MyVenueFoodOrderScope = 'CURRENT' | 'PAST';

/** An order this device placed, with the key that proves it. */
export interface VenueFoodOrderKey {
  order_id: string;
  access_key: string;
}

export interface MyVenueFoodOrdersInput {
  scope: MyVenueFoodOrderScope;
  venue_id?: string | null;
  keys?: VenueFoodOrderKey[];
  page?: number;
  page_size?: number;
}

/** What a row of "Your Food Orders" (and the venue's running-orders banner) shows — nothing more is asked for. */
export type MyVenueFoodOrder = Pick<
  VenueFoodOrder,
  'id' | 'order_no' | 'venue_id' | 'venue_name' | 'total' | 'currency_symbol' | 'status' | 'payment_status' | 'created_at'
> & { items: Array<Pick<VenueFoodOrderLine, 'name' | 'quantity'>> };

export interface MyVenueFoodOrdersPage {
  rows: MyVenueFoodOrder[];
  total: number;
  page: number;
  page_size: number;
}

/** The most keys the server reads from one device. */
export const MY_FOOD_ORDER_KEYS_MAX = 20;
/** Current orders are few — one page holds them. Past ones come a page at a time. */
export const MY_FOOD_ORDERS_PAGE_SIZE = { current: 20, past: 10 } as const;

/** Public: the caller's own orders — by account, or by the keys this device kept. */
export const MY_VENUE_FOOD_ORDERS_QUERY = /* GraphQL */ `
  query MyVenueFoodOrders($input: MyVenueFoodOrdersInput!) {
    myVenueFoodOrders(input: $input) {
      rows {
        id
        order_no
        venue_id
        venue_name
        total
        currency_symbol
        status
        payment_status
        created_at
        items {
          name
          quantity
        }
      }
      total
      page
      page_size
    }
  }
`;

/** The device's remembered orders as the query takes them — the newest first, at most what the server reads. */
export const foodOrderKeysOf = (stored: ReadonlyArray<VenueFoodOrderKey>): VenueFoodOrderKey[] =>
  stored
    .filter((entry) => entry.order_id && entry.access_key)
    .slice(0, MY_FOOD_ORDER_KEYS_MAX)
    .map((entry) => ({ order_id: entry.order_id, access_key: entry.access_key }));

/** The key this device kept for an order — what its link carries — or null for one opened by account. */
export const foodOrderKeyFor = (stored: ReadonlyArray<VenueFoodOrderKey>, orderId: string): string | null =>
  stored.find((entry) => entry.order_id === orderId)?.access_key ?? null;

/** More past orders wait on the server. */
export const hasMoreFoodOrders = (page: Pick<MyVenueFoodOrdersPage, 'page' | 'page_size' | 'total'> | null | undefined): boolean =>
  !!page && page.page * page.page_size < page.total;

/** A further page appended to what is shown; an order already shown (rows shifted meanwhile) is not shown twice. */
export function appendFoodOrders(shown: ReadonlyArray<MyVenueFoodOrder>, next: ReadonlyArray<MyVenueFoodOrder>): MyVenueFoodOrder[] {
  const seen = new Set(shown.map((order) => order.id));
  return [...shown, ...next.filter((order) => !seen.has(order.id))];
}

/** "2 × Paneer Tikka, 1 × Lime Soda" — the dishes of an order on one line. */
export const foodOrderLinesSummary = (
  t: FoodOwnerTranslate,
  items: ReadonlyArray<Pick<VenueFoodOrderLine, 'name' | 'quantity'>>
): string => items.map((line) => t('mweb.venueFood.myOrders.itemLine', { vars: { qty: line.quantity, name: line.name } })).join(', ');
