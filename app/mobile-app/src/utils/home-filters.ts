/**
 * Pure home-feed filter helpers — the RN port of mWeb's price/date/sort logic in
 * `useHomeData`/`FilterBar`. Kept framework-free so the rules are unit-testable
 * and identical to the website (mWeb ↔ mobile parity, CLAUDE.md #27).
 */

export type PriceFilter = 'ALL' | 'FREE' | 'PAID' | 'PREMIUM';
export type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'MONTH';
export type SortBy = 'DATE_ASC' | 'DATE_DESC' | 'PRICE_ASC' | 'PRICE_DESC';

export interface HomeFilters {
  price: PriceFilter;
  date: DateFilter;
  sort: SortBy;
}

export const DEFAULT_HOME_FILTERS: HomeFilters = {
  price: 'ALL',
  date: 'ALL',
  sort: 'DATE_ASC',
};

/** Selectable options (value + label) — shared by the filter sheet UI. */
export const PRICE_OPTIONS: readonly (readonly [PriceFilter, string])[] = [
  ['ALL', 'All'],
  ['FREE', 'Free'],
  ['PAID', 'Paid'],
  ['PREMIUM', 'Premium'],
];

export const DATE_OPTIONS: readonly (readonly [DateFilter, string])[] = [
  ['ALL', 'Any time'],
  ['TODAY', 'Today'],
  ['TOMORROW', 'Tomorrow'],
  ['WEEK', 'This Week'],
  ['MONTH', 'This Month'],
];

export const SORT_OPTIONS: readonly (readonly [SortBy, string])[] = [
  ['DATE_ASC', 'Date · Earliest first'],
  ['DATE_DESC', 'Date · Latest first'],
  ['PRICE_ASC', 'Price · Low to High'],
  ['PRICE_DESC', 'Price · High to Low'],
];

/** Count of non-default filters (category chip included) — drives the badge. */
export function activeFilterCount(filters: HomeFilters, categoryId: string): number {
  let count = 0;
  if (categoryId) count += 1;
  if (filters.price !== 'ALL') count += 1;
  if (filters.date !== 'ALL') count += 1;
  if (filters.sort !== DEFAULT_HOME_FILTERS.sort) count += 1;
  return count;
}

interface PricePod {
  pod_type?: string | null;
}

/** Price bucket match — mirrors mWeb's pod_type checks exactly. */
export function matchesPrice(pod: PricePod, price: PriceFilter): boolean {
  if (price === 'ALL') return true;
  const type = pod.pod_type ?? '';
  if (price === 'FREE') return type.includes('FREE');
  if (price === 'PAID') return type === 'NATIVE_PAID' || type === 'NON_NATIVE_PAID';
  return type === 'NATIVE_PAID_PREMIUM';
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Date-window match — Today/Tomorrow/Week/Month, relative to `now`. */
export function matchesDate(
  podDateTime: string | null | undefined,
  date: DateFilter,
  now: Date = new Date(),
): boolean {
  if (date === 'ALL') return true;
  if (!podDateTime) return false;
  const dt = new Date(podDateTime);
  const today0 = startOfDay(now);
  const tomorrow0 = new Date(today0);
  tomorrow0.setDate(today0.getDate() + 1);
  if (date === 'TODAY') return dt >= today0 && dt < tomorrow0;
  const dayAfter0 = new Date(today0);
  dayAfter0.setDate(today0.getDate() + 2);
  if (date === 'TOMORROW') return dt >= tomorrow0 && dt < dayAfter0;
  const weekEnd = new Date(today0);
  weekEnd.setDate(today0.getDate() + 7);
  if (date === 'WEEK') return dt >= today0 && dt < weekEnd;
  const monthEnd = new Date(today0);
  monthEnd.setMonth(today0.getMonth() + 1);
  return dt >= today0 && dt < monthEnd;
}

interface SortPod {
  pod_date_time?: string | null;
  pod_amount?: number | string | null;
}

/** Stable comparator for the four sort modes — matches mWeb's `cmp`. */
export function comparePods(a: SortPod, b: SortPod, sort: SortBy): number {
  switch (sort) {
    case 'DATE_DESC':
      return new Date(b.pod_date_time || 0).getTime() - new Date(a.pod_date_time || 0).getTime();
    case 'PRICE_ASC':
      return (Number(a.pod_amount) || 0) - (Number(b.pod_amount) || 0);
    case 'PRICE_DESC':
      return (Number(b.pod_amount) || 0) - (Number(a.pod_amount) || 0);
    default:
      return new Date(a.pod_date_time || 0).getTime() - new Date(b.pod_date_time || 0).getTime();
  }
}
