import { act, renderHook } from '@testing-library/react-native';

import { useShopFilters } from '@/hooks/useShopFilters';
import type { ShopProduct } from '@/screens/ShopScreen';

const categories = [
  { id: 'sup1', name: 'Lifestyle', level: 'SUPER', parent_id: null },
  { id: 'sup2', name: 'Food', level: 'SUPER', parent_id: null },
  { id: 'cat1', name: 'Apparel', level: 'CATEGORY', parent_id: 'sup1' },
  { id: 'sub1', name: 'Tees', level: 'SUB', parent_id: 'cat1' },
];

const product = (over: Partial<ShopProduct>): ShopProduct =>
  ({
    id: 'p',
    product_name: 'Item',
    brand_name: '',
    image_url: '',
    images: [],
    unit_cost: 100,
    available_count: 5,
    category_id: null,
    super_category_id: null,
    sub_category_id: null,
    created_at: null,
    review_summary: { average_rating: 0, total: 0 },
    ...over,
  }) as ShopProduct;

const products: ShopProduct[] = [
  product({
    id: 'p1',
    product_name: 'Alpha',
    brand_name: 'Acme',
    unit_cost: 100,
    super_category_id: 'sup1',
    category_id: 'cat1',
    review_summary: { average_rating: 4.6, total: 10 },
  }),
  product({
    id: 'p2',
    product_name: 'Beta',
    brand_name: 'Rival',
    unit_cost: 50,
    super_category_id: 'sup2',
    review_summary: { average_rating: 2, total: 5 },
  }),
  product({
    id: 'p3',
    product_name: 'Gamma',
    unit_cost: 200,
    super_category_id: 'sup1',
    category_id: 'cat1',
    sub_category_id: 'sub1',
    available_count: 0,
    review_summary: { average_rating: 5, total: 3 },
  }),
];

const ids = (list: ShopProduct[]) => list.map((p) => p.id);
const optIds = (opts: readonly (readonly [string, string])[]) => opts.map((o) => o[0]);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useShopFilters', () => {
  it('hides out-of-stock by default and sorts by name; toggling shows them', () => {
    const { result } = renderHook(() => useShopFilters(categories, products));
    // p3 is out of stock → hidden; p1/p2 sorted A→Z.
    expect(ids(result.current.visible)).toEqual(['p1', 'p2']);
    expect(result.current.superOptions).toHaveLength(2);
    expect(result.current.categoryOptions).toHaveLength(0);
    expect(result.current.activeCount).toBe(0);

    act(() => result.current.setIncludeOutOfStock(true));
    expect(ids(result.current.visible)).toEqual(['p1', 'p2', 'p3']);
    expect(result.current.activeCount).toBe(1);
  });

  it('drives the Super → Category → Sub cascade and resets narrower levels', () => {
    const { result } = renderHook(() => useShopFilters(categories, products));

    act(() => result.current.selectSuper('sup1'));
    expect(optIds(result.current.categoryOptions)).toEqual(['cat1']);
    expect(ids(result.current.visible)).toEqual(['p1']); // p2 (sup2) out, p3 out of stock
    expect(result.current.activeCount).toBe(1);

    act(() => result.current.selectCategory('cat1'));
    expect(optIds(result.current.subOptions)).toEqual(['sub1']);
    act(() => result.current.setSubId('sub1'));
    expect(result.current.subId).toBe('sub1');

    // Re-selecting the category clears the sub.
    act(() => result.current.selectCategory('cat1'));
    expect(result.current.subId).toBe('');

    // Switching super clears category + sub.
    act(() => result.current.setSubId('sub1'));
    act(() => result.current.selectSuper('sup2'));
    expect(result.current.categoryId).toBe('');
    expect(result.current.subId).toBe('');
    expect(result.current.categoryOptions).toHaveLength(0);
  });

  it('filters by minimum rating, treating a missing summary as zero', () => {
    const list = [
      products[0], // p1 avg 4.6
      products[1], // p2 avg 2
      product({ id: 'p6', product_name: 'Delta', review_summary: null }), // no summary → 0
    ];
    const { result } = renderHook(() => useShopFilters(categories, list));
    act(() => result.current.setMinRating('4'));
    expect(ids(result.current.visible)).toEqual(['p1']); // p2 (2) and p6 (0) excluded
    expect(result.current.activeCount).toBe(1);
  });

  it('filters by debounced search across name and brand, and re-sorts', () => {
    const { result } = renderHook(() => useShopFilters(categories, products));
    act(() => result.current.setSort('PRICE_ASC'));
    expect(ids(result.current.visible)).toEqual(['p2', 'p1']); // 50 before 100
    expect(result.current.activeCount).toBe(1);

    act(() => result.current.setQuery('acme'));
    act(() => jest.advanceTimersByTime(500));
    expect(ids(result.current.visible)).toEqual(['p1']); // only Acme brand matches
  });
});
