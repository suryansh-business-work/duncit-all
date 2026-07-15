import { useEffect, useMemo, useState } from 'react';

import type { HomeCategory, HomeClub } from '@/hooks/useHomeFeed';
import { makeCategoryMatcher } from '@/utils/category-match';

/** [value, label] option tuple consumed by OptionChipRow. */
export type CategoryOption = readonly [string, string];

/**
 * Client-side search + category filter for the Clubs tab. Matches the query
 * against the club name/description (case-insensitive) and the selected CATEGORY
 * against the club's category branch (equal/ancestor/descendant), so picking a
 * CATEGORY chip also keeps clubs tagged at its SUB descendants. The category
 * chips are scoped to the header's selected super category.
 */
export function useClubsFilter(
  clubs: HomeClub[],
  categories: HomeCategory[],
  selectedSuperId?: string | null,
) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // When the header super-category changes, clear the chosen chip so a category
  // from another super category isn't left selected (and now hidden).
  useEffect(() => {
    setCategoryId('');
  }, [selectedSuperId]);

  const categoryOptions = useMemo<CategoryOption[]>(
    () =>
      categories
        .filter(
          (category) =>
            category.level === 'CATEGORY' &&
            (!selectedSuperId || category.parent_id === selectedSuperId),
        )
        .map((category) => [category.id, category.name] as const)
        .sort((a, b) => a[1].localeCompare(b[1])),
    [categories, selectedSuperId],
  );

  const matchesCategory = useMemo(() => makeCategoryMatcher(categories), [categories]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clubs.filter((club) => {
      if (!matchesCategory(club, categoryId)) return false;
      if (!needle) return true;
      const haystack = `${club.club_name} ${club.club_description ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [clubs, query, categoryId, matchesCategory]);

  return { query, setQuery, categoryId, setCategoryId, categoryOptions, filtered };
}
