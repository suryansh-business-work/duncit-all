export type SearchSort = 'RELEVANCE' | 'DATE_ASC' | 'DATE_DESC' | 'POPULAR' | 'PARTICIPANTS';

export interface SearchSortOption {
  value: SearchSort;
  label: string;
  description: string;
}

export const SEARCH_SORT_OPTIONS: readonly SearchSortOption[] = [
  { value: 'RELEVANCE', label: 'Most Relevant', description: 'Our best match for your search.' },
  { value: 'DATE_ASC', label: 'Nearest Date First', description: 'Soonest upcoming experiences first.' },
  { value: 'DATE_DESC', label: 'Latest Date First', description: 'Furthest scheduled experiences first.' },
  { value: 'POPULAR', label: 'Most Popular', description: 'Clubs with the largest community.' },
  { value: 'PARTICIPANTS', label: 'Most Participants', description: 'Pods with the most people joining.' },
];

export interface ClubResultLike {
  next_pod_date?: string | null;
  participant_count: number;
  club: { followers_count: number };
}

const toMs = (iso?: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);

const COMPARATORS: Record<
  Exclude<SearchSort, 'RELEVANCE'>,
  (a: ClubResultLike, b: ClubResultLike) => number
> = {
  DATE_ASC: (a, b) => toMs(a.next_pod_date) - toMs(b.next_pod_date),
  DATE_DESC: (a, b) => toMs(b.next_pod_date) - toMs(a.next_pod_date),
  POPULAR: (a, b) => b.club.followers_count - a.club.followers_count,
  PARTICIPANTS: (a, b) => b.participant_count - a.participant_count,
};

/** Re-orders the (already server-sorted) results for the user's chosen sort.
 * RELEVANCE keeps the server order. Sorts a copy so the source array is untouched. */
export function sortClubResults<T extends ClubResultLike>(results: readonly T[], sort: SearchSort): T[] {
  const copy = [...results];
  if (sort === 'RELEVANCE') return copy;
  copy.sort(COMPARATORS[sort]);
  return copy;
}
