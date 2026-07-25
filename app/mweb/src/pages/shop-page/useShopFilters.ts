import { useMemo, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { SearchCategory } from '../search-page/useSearchDiscovery';
import { sortShopProducts, type ShopProduct, type ShopSort } from './queries';

type Option = readonly [string, string];

/** Minimum-average-rating buckets for the rating filter ('0' = any). */
export const SHOP_RATING_OPTIONS: ReadonlyArray<Option> = [
  ['0', 'Any'],
  ['3', '3★+'],
  ['4', '4★+'],
];

type Matcher = (product: ShopProduct, categoryId: string) => boolean;

const toOptions = (categories: SearchCategory[], level: string, parentId: string): Option[] =>
  categories
    .filter((c) => c.level === level && (parentId === '' || c.parent_id === parentId))
    .map((c) => [c.id, c.name] as const)
    .slice()
    .sort((a, b) => a[1].localeCompare(b[1]));

export interface ShopFilters {
  query: string;
  setQuery: (value: string) => void;
  superId: string;
  selectSuper: (id: string) => void;
  categoryId: string;
  selectCategory: (id: string) => void;
  subId: string;
  setSubId: (id: string) => void;
  minRating: string;
  setMinRating: (value: string) => void;
  includeOutOfStock: boolean;
  setIncludeOutOfStock: (value: boolean) => void;
  sort: ShopSort;
  setSort: (sort: ShopSort) => void;
  superOptions: Option[];
  categoryOptions: Option[];
  subOptions: Option[];
  activeCount: number;
  visible: ShopProduct[];
}

/** Pod Shop filter state + derivation: a Super → Category → Sub cascade, a
 * minimum-rating bucket, an include-out-of-stock toggle (off by default so
 * unavailable products are hidden), debounced search and sort. Twin of the
 * mobile app's useShopFilters. */
export function useShopFilters(
  categories: SearchCategory[],
  products: ShopProduct[],
  matches: Matcher,
): ShopFilters {
  const [query, setQuery] = useState('');
  const [superId, setSuperId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subId, setSubId] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false);
  const [sort, setSort] = useState<ShopSort>('NAME');
  const search = useDebouncedValue(query, 350);

  // Selecting a broader level clears the narrower ones so the cascade stays valid.
  const selectSuper = (id: string) => {
    setSuperId(id);
    setCategoryId('');
    setSubId('');
  };
  const selectCategory = (id: string) => {
    setCategoryId(id);
    setSubId('');
  };

  const superOptions = useMemo(() => toOptions(categories, 'SUPER', ''), [categories]);
  const categoryOptions = useMemo(
    () => (superId ? toOptions(categories, 'CATEGORY', superId) : []),
    [categories, superId],
  );
  const subOptions = useMemo(
    () => (categoryId ? toOptions(categories, 'SUB', categoryId) : []),
    [categories, categoryId],
  );

  const effectiveCategoryId = subId || categoryId || superId;
  const activeCount =
    (effectiveCategoryId ? 1 : 0) +
    (minRating === '0' ? 0 : 1) +
    (includeOutOfStock ? 1 : 0) +
    (sort === 'NAME' ? 0 : 1);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const min = Number(minRating);
    const keep = (p: ShopProduct) => {
      if (!matches(p, effectiveCategoryId)) return false;
      if (!includeOutOfStock && p.pod_available_count <= 0) return false;
      if (min > 0 && (p.review_summary?.average_rating ?? 0) < min) return false;
      if (!term) return true;
      return Boolean(
        p.product_name?.toLowerCase().includes(term) || p.brand_name?.toLowerCase().includes(term),
      );
    };
    return sortShopProducts(products.filter(keep), sort);
  }, [products, matches, effectiveCategoryId, includeOutOfStock, minRating, search, sort]);

  return {
    query,
    setQuery,
    superId,
    selectSuper,
    categoryId,
    selectCategory,
    subId,
    setSubId,
    minRating,
    setMinRating,
    includeOutOfStock,
    setIncludeOutOfStock,
    sort,
    setSort,
    superOptions,
    categoryOptions,
    subOptions,
    activeCount,
    visible,
  };
}
