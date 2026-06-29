import { SEARCH_SORT_OPTIONS, sortClubResults } from '@/utils/search-sort';
import type { SearchClubResult } from '@/hooks/useSearch';

const result = (
  id: string,
  followers: number,
  participants: number,
  nextPodDate: string | null,
): SearchClubResult =>
  ({
    next_pod_date: nextPodDate,
    participant_count: participants,
    club: { id, followers_count: followers },
  }) as unknown as SearchClubResult;

const ids = (results: SearchClubResult[]) => results.map((r) => r.club.id);

describe('sortClubResults', () => {
  const a = result('a', 10, 3, '2030-01-05T00:00:00.000Z');
  const b = result('b', 30, 1, '2030-01-02T00:00:00.000Z');
  const c = result('c', 20, 8, null);
  const all = [a, b, c];

  it('keeps the server order for RELEVANCE and does not mutate the source', () => {
    const sorted = sortClubResults(all, 'RELEVANCE');
    expect(ids(sorted)).toEqual(['a', 'b', 'c']);
    expect(ids(all)).toEqual(['a', 'b', 'c']);
  });

  it('orders by nearest date first, pushing dateless clubs last', () => {
    expect(ids(sortClubResults(all, 'DATE_ASC'))).toEqual(['b', 'a', 'c']);
  });

  it('orders by latest date first', () => {
    expect(ids(sortClubResults(all, 'DATE_DESC'))).toEqual(['c', 'a', 'b']);
  });

  it('orders by most followers', () => {
    expect(ids(sortClubResults(all, 'POPULAR'))).toEqual(['b', 'c', 'a']);
  });

  it('orders by most participants', () => {
    expect(ids(sortClubResults(all, 'PARTICIPANTS'))).toEqual(['c', 'a', 'b']);
  });

  it('exposes a labelled option for every sort value used by the sheet', () => {
    expect(SEARCH_SORT_OPTIONS.map(([value]) => value)).toEqual([
      'RELEVANCE',
      'DATE_ASC',
      'DATE_DESC',
      'POPULAR',
      'PARTICIPANTS',
    ]);
  });
});
