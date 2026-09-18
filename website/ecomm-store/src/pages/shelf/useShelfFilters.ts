import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import type { StoreSearchInput, StoreSort } from '../../graphql/catalog';

export const PAGE_SIZE = 24;
const FACET_PREFIX = 'f_';
const LIST_SEPARATOR = ',';

export const SORTS: readonly StoreSort[] = ['RELEVANCE', 'NEWEST', 'BESTSELLING', 'PRICE_ASC', 'PRICE_DESC', 'DISCOUNT', 'RATING'];
const SORT_SET: ReadonlySet<string> = new Set(SORTS);

/** What the route itself fixes — a category page is always that category. */
export type ShelfScope = Pick<StoreSearchInput, 'category' | 'collection' | 'pet_type' | 'brand_ids'>;

export interface ShelfFilters {
  q: string;
  pet: string;
  brands: string[];
  facets: Record<string, string[]>;
  min: number | null;
  max: number | null;
  inStock: boolean;
  onSale: boolean;
  sort: StoreSort | null;
  page: number;
}

const list = (value: string | null): string[] => (value ? value.split(LIST_SEPARATOR).filter(Boolean) : []);

const numberOrNull = (value: string | null): number | null => {
  if (value === null || value === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function readFilters(params: URLSearchParams): ShelfFilters {
  const facets: Record<string, string[]> = {};
  params.forEach((value, key) => {
    if (key.startsWith(FACET_PREFIX)) facets[key.slice(FACET_PREFIX.length)] = list(value);
  });
  const sort = params.get('sort') ?? '';
  return {
    q: params.get('q') ?? '',
    pet: params.get('pet') ?? '',
    brands: list(params.get('brand')),
    facets,
    min: numberOrNull(params.get('min')),
    max: numberOrNull(params.get('max')),
    inStock: params.get('stock') === '1',
    onSale: params.get('sale') === '1',
    sort: SORT_SET.has(sort) ? (sort as StoreSort) : null,
    page: Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1),
  };
}

/** The search input for this shelf: the route's scope plus whatever the shopper chose. */
export function toSearchInput(filters: ShelfFilters, scope: ShelfScope): StoreSearchInput {
  const facets = Object.entries(filters.facets)
    .filter(([, values]) => values.length > 0)
    .map(([facet, values]) => ({ facet, values }));
  const brandIds = scope.brand_ids ?? filters.brands;
  return {
    ...scope,
    q: filters.q || undefined,
    pet_type: scope.pet_type ?? (filters.pet || undefined),
    brand_ids: brandIds.length > 0 ? brandIds : undefined,
    facets: facets.length > 0 ? facets : undefined,
    min_price: filters.min ?? undefined,
    max_price: filters.max ?? undefined,
    in_stock_only: filters.inStock || undefined,
    on_sale: filters.onSale || undefined,
    sort: filters.sort ?? undefined,
    page: filters.page,
    page_size: PAGE_SIZE,
  };
}

/** Filters, sort and page live in the query string, so a shelf can be shared and reloaded. */
export function useShelfFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);

  /** Change one or more params; anything but paging starts again from page 1. */
  const update = useCallback(
    (changes: Record<string, string | null>, keepPage = false) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          }
          if (!keepPage) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const toggleInList = useCallback(
    (key: string, current: string[], value: string) => {
      const nextList = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      update({ [key]: nextList.join(LIST_SEPARATOR) || null });
    },
    [update],
  );

  return {
    filters,
    setSort: (sort: StoreSort) => update({ sort }),
    setPage: (page: number) => update({ page: page > 1 ? String(page) : null }, true),
    setPet: (slug: string) => update({ pet: filters.pet === slug ? null : slug }),
    toggleBrand: (id: string) => toggleInList('brand', filters.brands, id),
    toggleFacet: (facet: string, value: string) => toggleInList(`${FACET_PREFIX}${facet}`, filters.facets[facet] ?? [], value),
    setPrice: (min: number | null, max: number | null) =>
      update({ min: min === null ? null : String(min), max: max === null ? null : String(max) }),
    setInStock: (on: boolean) => update({ stock: on ? '1' : null }),
    setOnSale: (on: boolean) => update({ sale: on ? '1' : null }),
    clearAll: () => setParams(filters.q ? { q: filters.q } : {}, { replace: true }),
  };
}

export type ShelfControls = ReturnType<typeof useShelfFilters>;
