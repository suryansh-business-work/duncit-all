import type { SearchClubResult } from '@/hooks/useSearch';

export type SearchSort = 'RELEVANCE' | 'DATE_ASC' | 'DATE_DESC' | 'POPULAR' | 'PARTICIPANTS';

/** [value, label] pairs for the Sort sheet — single source of truth (rule 2). */
export const SEARCH_SORT_OPTIONS: readonly (readonly [SearchSort, string])[] = [
  ['RELEVANCE', 'Most Relevant'],
  ['DATE_ASC', 'Nearest Date First'],
  ['DATE_DESC', 'Latest Date First'],
  ['POPULAR', 'Most Popular'],
  ['PARTICIPANTS', 'Most Participants'],
];

const toMs = (iso?: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);

const COMPARATORS: Record<
  Exclude<SearchSort, 'RELEVANCE'>,
  (a: SearchClubResult, b: SearchClubResult) => number
> = {
  DATE_ASC: (a, b) => toMs(a.next_pod_date) - toMs(b.next_pod_date),
  DATE_DESC: (a, b) => toMs(b.next_pod_date) - toMs(a.next_pod_date),
  POPULAR: (a, b) => b.club.followers_count - a.club.followers_count,
  PARTICIPANTS: (a, b) => b.participant_count - a.participant_count,
};

/** Re-orders the (already server-sorted) results for the user's chosen sort.
 * RELEVANCE keeps server order. Sorts a copy so the source array is untouched. */
export function sortClubResults(
  results: readonly SearchClubResult[],
  sort: SearchSort,
): SearchClubResult[] {
  const copy = [...results];
  if (sort === 'RELEVANCE') return copy;
  copy.sort(COMPARATORS[sort]);
  return copy;
}
