import { useMemo, useState } from 'react';

import type { HomeCategory, HomeClub } from '@/hooks/useHomeFeed';

/** [value, label] option tuple consumed by OptionChipRow. */
export type CategoryOption = readonly [string, string];

/**
 * Client-side search + category filter for the Clubs tab. Matches the query
 * against the club name/description (case-insensitive) and the selected CATEGORY
 * against the club's `category_id` or `super_category_id`.
 */
export function useClubsFilter(clubs: HomeClub[], categories: HomeCategory[]) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const categoryOptions = useMemo<CategoryOption[]>(
    () =>
      categories
        .filter((category) => category.level === 'CATEGORY')
        .map((category) => [category.id, category.name] as const)
        .sort((a, b) => a[1].localeCompare(b[1])),
    [categories],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clubs.filter((club) => {
      const matchesCategory =
        !categoryId || club.category_id === categoryId || club.super_category_id === categoryId;
      if (!matchesCategory) return false;
      if (!needle) return true;
      const haystack = `${club.club_name} ${club.club_description ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [clubs, query, categoryId]);

  return { query, setQuery, categoryId, setCategoryId, categoryOptions, filtered };
}
