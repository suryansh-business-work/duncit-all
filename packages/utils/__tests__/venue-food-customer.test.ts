import { describe, expect, it, vi } from 'vitest';
import {
  FOOD_OTHER_SECTION_KEY,
  MY_FOOD_ORDER_KEYS_MAX,
  MY_FOOD_ORDERS_PAGE_SIZE,
  MY_FOOD_ORDERS_PATH,
  MY_VENUE_FOOD_ORDERS_QUERY,
  VENUE_FOOD_RATING_QUERY,
  allFoodSectionsOpen,
  appendFoodOrders,
  filterFoodMenuGroups,
  findFoodItem,
  foodItemMatches,
  foodMenuHasSections,
  foodMenuView,
  foodOrderKeyFor,
  foodOrderKeysOf,
  foodOrderLinesSummary,
  foodSearchTerms,
  foodSectionKey,
  foodSectionsAfterSearch,
  formatFoodRating,
  hasFoodRating,
  hasMoreFoodOrders,
  isFoodSectionOpen,
  toggleAllFoodSections,
  toggleFoodSection,
  venueFoodItemPath,
  type MyVenueFoodOrder,
  type VenueFoodOrderKey,
} from '../src/venue-food-customer';
import type { FoodMenuGroup, VenueFoodItem } from '../src/venue-food';

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id: 'dish_1',
  name: 'Paneer Tikka',
  description: 'Smoky cottage cheese',
  category: 'Starters',
  price: 240,
  images: [],
  diet: 'VEG',
  spice_level: 'MEDIUM',
  is_available: true,
  ...over,
});

const tikka = dish();
const soda = dish({ id: 'dish_2', name: 'Lime Soda', description: 'Fresh and fizzy', category: 'Drinks', price: 80 });
const naan = dish({ id: 'dish_3', name: 'Butter Naan', description: '', category: '', price: 50 });

const groups: FoodMenuGroup[] = [
  { category: 'Starters', items: [tikka] },
  { category: 'Drinks', items: [soda] },
  { category: '', items: [naan] },
];

const order = (id: string): MyVenueFoodOrder => ({
  id,
  order_no: `F-${id}`,
  venue_id: 'venue_1',
  venue_name: 'Cafe Uno',
  total: 432,
  currency_symbol: '₹',
  status: 'PLACED',
  payment_status: 'PAID',
  created_at: '2026-10-14T10:00:00.000Z',
  items: [{ name: 'Paneer Tikka', quantity: 2 }],
});

describe('foodSearchTerms', () => {
  it('splits a search into lower-cased words', () => {
    expect(foodSearchTerms('  Paneer   TIKKA ')).toEqual(['paneer', 'tikka']);
  });

  it('has no words for an empty, blank or missing search', () => {
    expect(foodSearchTerms('')).toEqual([]);
    expect(foodSearchTerms('   ')).toEqual([]);
    expect(foodSearchTerms(null)).toEqual([]);
    expect(foodSearchTerms(undefined)).toEqual([]);
  });
});

describe('foodItemMatches', () => {
  it('matches when every word is in the name or the description', () => {
    expect(foodItemMatches(tikka, ['paneer'])).toBe(true);
    expect(foodItemMatches(tikka, ['smoky', 'tikka'])).toBe(true);
    expect(foodItemMatches(tikka, ['tik'])).toBe(true);
  });

  it('refuses a dish that misses any word', () => {
    expect(foodItemMatches(tikka, ['paneer', 'soda'])).toBe(false);
  });

  it('matches every dish for no words', () => {
    expect(foodItemMatches(tikka, [])).toBe(true);
  });

  it('reads a dish the wire sent without a name or description as blank', () => {
    const bare = JSON.parse('{"id":"x"}') as VenueFoodItem;
    expect(foodItemMatches(bare, ['paneer'])).toBe(false);
    expect(foodItemMatches(bare, [])).toBe(true);
  });
});

describe('filterFoodMenuGroups', () => {
  it('keeps every section, as a fresh list, for an empty search', () => {
    const out = filterFoodMenuGroups(groups, '  ');
    expect(out).toEqual(groups);
    expect(out).not.toBe(groups);
    expect(filterFoodMenuGroups(groups, null)).toEqual(groups);
  });

  it('cuts each section to the dishes that match and drops a section left empty', () => {
    expect(filterFoodMenuGroups(groups, 'fizzy')).toEqual([{ category: 'Drinks', items: [soda] }]);
    expect(filterFoodMenuGroups(groups, 'NAAN')).toEqual([{ category: '', items: [naan] }]);
  });

  it('answers no sections when nothing matches', () => {
    expect(filterFoodMenuGroups(groups, 'biryani')).toEqual([]);
  });
});

describe('the menu sections', () => {
  it('folds only a menu with at least one named category', () => {
    expect(foodMenuHasSections(groups)).toBe(true);
    expect(foodMenuHasSections([{ category: '', items: [naan] }])).toBe(false);
    expect(foodMenuHasSections([])).toBe(false);
  });

  it('keys a section by its category, the uncategorised one by the empty string', () => {
    expect(foodSectionKey({ category: 'Drinks' })).toBe('Drinks');
    expect(foodSectionKey({ category: '' })).toBe('');
    expect(FOOD_OTHER_SECTION_KEY).toBe('mweb.venueFood.menuSearch.otherSection');
  });

  it('holds a section open unless it was folded', () => {
    expect(isFoodSectionOpen('Drinks', [])).toBe(true);
    expect(isFoodSectionOpen('Drinks', ['Drinks'])).toBe(false);
    expect(isFoodSectionOpen('', ['Drinks'])).toBe(true);
  });

  it('opens every section once a search has words, and leaves them as they are otherwise', () => {
    expect(foodSectionsAfterSearch(['Drinks', 'Starters'], 'soda')).toEqual([]);
    const collapsed = ['Drinks'];
    const kept = foodSectionsAfterSearch(collapsed, '  ');
    expect(kept).toEqual(['Drinks']);
    expect(kept).not.toBe(collapsed);
  });

  it('toggles one section without touching the others', () => {
    expect(toggleFoodSection([], 'Drinks')).toEqual(['Drinks']);
    expect(toggleFoodSection(['Starters', 'Drinks'], 'Drinks')).toEqual(['Starters']);
  });

  it('collapses all when all are open, and expands all otherwise', () => {
    expect(allFoodSectionsOpen(groups, [])).toBe(true);
    expect(allFoodSectionsOpen(groups, ['Drinks'])).toBe(false);
    expect(toggleAllFoodSections(groups, [])).toEqual(['Starters', 'Drinks', '']);
    expect(toggleAllFoodSections(groups, ['Drinks'])).toEqual([]);
  });

  it('reads an empty menu as all open', () => {
    expect(allFoodSectionsOpen([], ['Drinks'])).toBe(true);
    expect(toggleAllFoodSections([], [])).toEqual([]);
  });
});

describe('a dish page', () => {
  it('finds the dish, or null once it is off the menu', () => {
    expect(findFoodItem([tikka, soda], 'dish_2')).toBe(soda);
    expect(findFoodItem([tikka, soda], 'gone')).toBeNull();
    expect(findFoodItem([], 'dish_1')).toBeNull();
  });

  it('builds the public path with both ids encoded', () => {
    expect(venueFoodItemPath('venue_1', 'dish_1')).toBe('/venue/venue_1/food/dish_1');
    expect(venueFoodItemPath('a/b', 'c d')).toBe('/venue/a%2Fb/food/c%20d');
    expect(MY_FOOD_ORDERS_PATH).toBe('/food-orders');
  });
});

describe('the food rating', () => {
  it('asks for the venue rating on its own', () => {
    expect(VENUE_FOOD_RATING_QUERY).toContain('query VenueFoodRating($venueId: ID!)');
    expect(VENUE_FOOD_RATING_QUERY).toContain('venueFoodRating(venue_id: $venueId)');
    expect(VENUE_FOOD_RATING_QUERY.split('{')).toHaveLength(VENUE_FOOD_RATING_QUERY.split('}').length);
  });

  it('shows a rating only once somebody rated', () => {
    expect(hasFoodRating({ venue_id: 'v', average: 4.2, count: 3 })).toBe(true);
    expect(hasFoodRating({ venue_id: 'v', average: 0, count: 0 })).toBe(false);
    expect(hasFoodRating(null)).toBe(false);
    expect(hasFoodRating(undefined)).toBe(false);
  });

  it('reads the average to one decimal', () => {
    expect(formatFoodRating(4)).toBe('4.0');
    expect(formatFoodRating(4.26)).toBe('4.3');
    expect(formatFoodRating(4.24)).toBe('4.2');
    expect(formatFoodRating(5)).toBe('5.0');
  });
});

describe('Your Food Orders', () => {
  it('asks only for what a row shows, paged', () => {
    expect(MY_VENUE_FOOD_ORDERS_QUERY).toContain('query MyVenueFoodOrders($input: MyVenueFoodOrdersInput!)');
    expect(MY_VENUE_FOOD_ORDERS_QUERY).toContain('myVenueFoodOrders(input: $input)');
    for (const field of ['order_no', 'payment_status', 'page_size', 'quantity']) {
      expect(MY_VENUE_FOOD_ORDERS_QUERY).toContain(field);
    }
    expect(MY_VENUE_FOOD_ORDERS_QUERY).not.toContain('customer_phone');
    expect(MY_VENUE_FOOD_ORDERS_QUERY.split('{')).toHaveLength(MY_VENUE_FOOD_ORDERS_QUERY.split('}').length);
    expect(MY_FOOD_ORDERS_PAGE_SIZE).toEqual({ current: 20, past: 10 });
  });

  it('sends only complete keys, at most what the server reads, without extra stored fields', () => {
    const stored: Array<VenueFoodOrderKey & { venue_name?: string }> = [
      { order_id: 'o1', access_key: 'k1', venue_name: 'Cafe Uno' },
      { order_id: '', access_key: 'k2' },
      { order_id: 'o3', access_key: '' },
    ];
    expect(foodOrderKeysOf(stored)).toEqual([{ order_id: 'o1', access_key: 'k1' }]);

    const many = Array.from({ length: MY_FOOD_ORDER_KEYS_MAX + 5 }, (_, i) => ({ order_id: `o${i}`, access_key: `k${i}` }));
    const sent = foodOrderKeysOf(many);
    expect(sent).toHaveLength(MY_FOOD_ORDER_KEYS_MAX);
    expect(sent[0]).toEqual({ order_id: 'o0', access_key: 'k0' });
    expect(foodOrderKeysOf([])).toEqual([]);
  });

  it('finds the key this device kept for an order, or null for one opened by account', () => {
    const stored = [{ order_id: 'o1', access_key: 'k1' }];
    expect(foodOrderKeyFor(stored, 'o1')).toBe('k1');
    expect(foodOrderKeyFor(stored, 'o2')).toBeNull();
  });

  it('knows when more past orders wait on the server', () => {
    expect(hasMoreFoodOrders({ page: 1, page_size: 10, total: 11 })).toBe(true);
    expect(hasMoreFoodOrders({ page: 1, page_size: 10, total: 10 })).toBe(false);
    expect(hasMoreFoodOrders({ page: 2, page_size: 10, total: 15 })).toBe(false);
    expect(hasMoreFoodOrders(null)).toBe(false);
    expect(hasMoreFoodOrders(undefined)).toBe(false);
  });

  it('appends a further page without showing an order twice', () => {
    expect(appendFoodOrders([order('a'), order('b')], [order('b'), order('c')]).map((o) => o.id)).toEqual(['a', 'b', 'c']);
    expect(appendFoodOrders([], [order('a')]).map((o) => o.id)).toEqual(['a']);
    expect(appendFoodOrders([order('a')], [])).toEqual([order('a')]);
  });

  it('summarises the dishes of an order on one line', () => {
    const t = vi.fn((_key: string, options?: { vars?: Record<string, string | number> }) =>
      `${options?.vars?.qty} × ${options?.vars?.name}`,
    );
    expect(
      foodOrderLinesSummary(t, [
        { name: 'Paneer Tikka', quantity: 2 },
        { name: 'Lime Soda', quantity: 1 },
      ]),
    ).toBe('2 × Paneer Tikka, 1 × Lime Soda');
    expect(t).toHaveBeenCalledWith('mweb.venueFood.myOrders.itemLine', { vars: { qty: 2, name: 'Paneer Tikka' } });
    expect(foodOrderLinesSummary(t, [])).toBe('');
  });
});

describe('foodMenuView', () => {
  it('shows the whole sectioned menu, all open, with no search and nothing folded', () => {
    expect(foodMenuView(groups, '', [])).toEqual({ shown: groups, sectioned: true, allOpen: true });
  });

  it('narrows to the matching section and judges "all open" on what is shown, not the whole menu', () => {
    const drinksKey = foodSectionKey(groups[1] as FoodMenuGroup);
    const view = foodMenuView(groups, 'paneer', [drinksKey]);
    expect(view.shown).toEqual([{ category: 'Starters', items: [tikka] }]);
    expect(view.sectioned).toBe(true);
    // Drinks is folded but not shown, so every shown section is still open.
    expect(view.allOpen).toBe(true);
  });

  it('reports a folded shown section, and a menu without categories as unsectioned', () => {
    const startersKey = foodSectionKey(groups[0] as FoodMenuGroup);
    expect(foodMenuView(groups, '', [startersKey]).allOpen).toBe(false);
    const flat: FoodMenuGroup[] = [{ category: '', items: [naan] }];
    expect(foodMenuView(flat, '', []).sectioned).toBe(false);
  });
});
