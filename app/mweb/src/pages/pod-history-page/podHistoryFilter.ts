import { makeCategoryMatcher } from '../../utils/category-match';
import type { PodHistoryItem, PodHistoryCategory } from './queries';

export type PodHistorySort = 'DATE_DESC' | 'DATE_ASC' | 'PRICE_ASC' | 'PRICE_DESC';

export interface PodHistorySortOption {
  value: PodHistorySort;
  label: string;
}

export const POD_HISTORY_SORTS: readonly PodHistorySortOption[] = [
  { value: 'DATE_DESC', label: 'Date · Newest first' },
  { value: 'DATE_ASC', label: 'Date · Oldest first' },
  { value: 'PRICE_ASC', label: 'Price · Low to High' },
  { value: 'PRICE_DESC', label: 'Price · High to Low' },
];

export interface PodHistoryFilters {
  superId: string;
  categoryId: string;
  sort: PodHistorySort;
}

export const DEFAULT_POD_HISTORY_FILTERS: PodHistoryFilters = {
  superId: '',
  categoryId: '',
  sort: 'DATE_DESC',
};

const toMs = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

const COMPARATORS: Record<PodHistorySort, (a: PodHistoryItem, b: PodHistoryItem) => number> = {
  DATE_DESC: (a, b) => toMs(b.pod?.pod_date_time) - toMs(a.pod?.pod_date_time),
  DATE_ASC: (a, b) => toMs(a.pod?.pod_date_time) - toMs(b.pod?.pod_date_time),
  PRICE_ASC: (a, b) => (a.pod?.pod_amount ?? 0) - (b.pod?.pod_amount ?? 0),
  PRICE_DESC: (a, b) => (b.pod?.pod_amount ?? 0) - (a.pod?.pod_amount ?? 0),
};

/**
 * Filter the joined-pod list by Super Category → Category, then sort it.
 *
 * A club is tagged at its leaf category (typically the SUB level), so a naive
 * `club.category_id === filters.categoryId` matched nothing. We instead match on
 * the whole root-to-leaf path via {@link makeCategoryMatcher}: a Category filter
 * keeps clubs tagged at that category OR any of its SUB descendants (mirrors the
 * Clubs/Search filter). The deepest selected level (category over super) wins.
 */
export function applyPodHistory(
  items: readonly PodHistoryItem[],
  filters: PodHistoryFilters,
  categories: readonly PodHistoryCategory[] = [],
): PodHistoryItem[] {
  const matches = makeCategoryMatcher(categories);
  const target = filters.categoryId || filters.superId;
  const filtered = items.filter((item) => matches(item.pod?.club, target));
  const copy = [...filtered];
  copy.sort(COMPARATORS[filters.sort]);
  return copy;
}

/** Top-level (For You / For Your Pet) options for the Super Category dropdown. */
export const superCategories = (cats: readonly PodHistoryCategory[]): PodHistoryCategory[] =>
  cats.filter((c) => c.level === 'SUPER');

/** Category options under a selected super (empty until a super is chosen). */
export const categoriesUnder = (
  cats: readonly PodHistoryCategory[],
  superId: string,
): PodHistoryCategory[] =>
  superId ? cats.filter((c) => c.level === 'CATEGORY' && c.parent_id === superId) : [];

export const activePodHistoryFilterCount = (filters: PodHistoryFilters): number =>
  (filters.superId ? 1 : 0) + (filters.categoryId ? 1 : 0);
