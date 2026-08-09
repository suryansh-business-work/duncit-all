import { makeCategoryMatcher } from '../../utils/category-match';
import type { PodHistoryItem, PodHistoryCategory } from './queries';

export type PodHistorySort = 'DATE_DESC' | 'DATE_ASC' | 'PRICE_ASC' | 'PRICE_DESC';

export interface PodHistorySortOption {
  value: PodHistorySort;
  /** Translation key — the menu resolves it through `t`. */
  labelKey: string;
}

export const POD_HISTORY_SORTS: readonly PodHistorySortOption[] = [
  { value: 'DATE_DESC', labelKey: 'mweb.podHistory.sortDateNewest' },
  { value: 'DATE_ASC', labelKey: 'mweb.podHistory.sortDateOldest' },
  { value: 'PRICE_ASC', labelKey: 'mweb.podHistory.sortPriceLowHigh' },
  { value: 'PRICE_DESC', labelKey: 'mweb.podHistory.sortPriceHighLow' },
];

export interface PodHistoryFilters {
  /** Free-text query typed in the Pod History search box. */
  search: string;
  superId: string;
  categoryId: string;
  sort: PodHistorySort;
}

export const DEFAULT_POD_HISTORY_FILTERS: PodHistoryFilters = {
  search: '',
  superId: '',
  categoryId: '',
  sort: 'DATE_DESC',
};

/**
 * Case-insensitive match over the fields a joined pod is recognised by: its
 * title, its pod id and the club slug it belongs to. An empty term matches
 * everything. The list is already in memory (myPodMemberships returns the whole
 * history), so this filters client-side — no query round-trip per keystroke.
 */
export function matchesPodHistorySearch(item: PodHistoryItem, term: string): boolean {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  const pod = item.pod;
  return [pod?.pod_title, pod?.pod_id, pod?.club_slug].some((field) => !!field?.toLowerCase().includes(query));
}

const toMs = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

const COMPARATORS: Record<PodHistorySort, (a: PodHistoryItem, b: PodHistoryItem) => number> = {
  DATE_DESC: (a, b) => toMs(b.pod?.pod_date_time) - toMs(a.pod?.pod_date_time),
  DATE_ASC: (a, b) => toMs(a.pod?.pod_date_time) - toMs(b.pod?.pod_date_time),
  PRICE_ASC: (a, b) => (a.pod?.pod_amount ?? 0) - (b.pod?.pod_amount ?? 0),
  PRICE_DESC: (a, b) => (b.pod?.pod_amount ?? 0) - (a.pod?.pod_amount ?? 0),
};

/**
 * Filter the joined-pod list by search text and Super Category → Category, then
 * sort it.
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
  const filtered = items.filter(
    (item) => matches(item.pod?.club, target) && matchesPodHistorySearch(item, filters.search),
  );
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
