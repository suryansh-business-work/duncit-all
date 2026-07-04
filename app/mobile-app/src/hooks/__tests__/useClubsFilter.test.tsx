import { act, renderHook } from '@testing-library/react-native';

import { useClubsFilter } from '@/hooks/useClubsFilter';
import type { HomeCategory, HomeClub } from '@/hooks/useHomeFeed';

const club = (over: Partial<HomeClub>): HomeClub =>
  ({
    id: over.id ?? 'c',
    club_id: over.club_id ?? `cl-${over.id ?? 'c'}`,
    club_name: over.club_name ?? 'Club',
    club_description: over.club_description ?? null,
    club_feature_images_and_videos: [],
    category_id: over.category_id ?? null,
    super_category_id: over.super_category_id ?? null,
  }) as never;

const categories: HomeCategory[] = [
  { id: 'cat2', name: 'Arts', slug: 'arts', level: 'CATEGORY', parent_id: null },
  { id: 'cat1', name: 'Sports', slug: 'sports', level: 'CATEGORY', parent_id: null },
  { id: 'sub1', name: 'Jazz', slug: 'jazz', level: 'SUB', parent_id: 'cat2' },
] as never;

const clubs: HomeClub[] = [
  club({ id: '1', club_name: 'Runners Club', club_description: 'We run', category_id: 'cat1' }),
  club({ id: '2', club_name: 'Painters', super_category_id: 'cat2' }),
  club({ id: '3', club_name: 'Chess Masters', club_description: null }),
];

describe('useClubsFilter', () => {
  it('exposes only CATEGORY-level options, sorted alphabetically', () => {
    const { result } = renderHook(() => useClubsFilter(clubs, categories));
    expect(result.current.categoryOptions).toEqual([
      ['cat2', 'Arts'],
      ['cat1', 'Sports'],
    ]);
  });

  it('returns all clubs when nothing is filtered', () => {
    const { result } = renderHook(() => useClubsFilter(clubs, categories));
    expect(result.current.filtered).toHaveLength(3);
  });

  it('filters by a case-insensitive name/description query', () => {
    const { result } = renderHook(() => useClubsFilter(clubs, categories));
    act(() => result.current.setQuery('RUN')); // matches name + description of club 1
    expect(result.current.filtered.map((c) => c.id)).toEqual(['1']);
    act(() => result.current.setQuery('zzz'));
    expect(result.current.filtered).toHaveLength(0);
  });

  it('filters by the club category_id or super_category_id', () => {
    const { result } = renderHook(() => useClubsFilter(clubs, categories));
    act(() => result.current.setCategoryId('cat1')); // matches club 1 via category_id
    expect(result.current.filtered.map((c) => c.id)).toEqual(['1']);
    act(() => result.current.setCategoryId('cat2')); // matches club 2 via super_category_id
    expect(result.current.filtered.map((c) => c.id)).toEqual(['2']);
  });

  it('combines a category and a query', () => {
    const { result } = renderHook(() => useClubsFilter(clubs, categories));
    act(() => {
      result.current.setCategoryId('cat1');
      result.current.setQuery('painter'); // category keeps only club 1, which fails the query
    });
    expect(result.current.filtered).toHaveLength(0);
  });
});
