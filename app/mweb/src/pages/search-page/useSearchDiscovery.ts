import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { SEARCH_DISCOVERY, SEARCH_CATEGORIES } from './queries';

export interface SearchCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  level: string;
  parent_id?: string | null;
}

/** Discovery results for the active query/category. Skipped (and `active=false`)
 * when there is nothing to search, so the page can show category quick-actions. */
export function useSearchDiscovery(query: string, categoryId: string) {
  const active = query.length > 0 || categoryId.length > 0;
  const { data, loading, refetch } = useQuery(SEARCH_DISCOVERY, {
    variables: { input: { query: query || undefined, category_id: categoryId || undefined } },
    skip: !active,
    fetchPolicy: 'cache-and-network',
  });
  const result = data?.searchDiscovery;
  return {
    happening: useMemo(() => result?.happening ?? [], [result]),
    moreClubs: useMemo(() => result?.more_clubs ?? [], [result]),
    loading,
    active,
    refetch,
  };
}

/** Categories for the quick-action buttons + club-card labels. */
export function useSearchCategories() {
  const { data } = useQuery(SEARCH_CATEGORIES, { fetchPolicy: 'cache-first' });
  const all: SearchCategory[] = useMemo(() => data?.categories ?? [], [data]);

  const buttons = useMemo(() => {
    const categoryLevel = all.filter((c) => c.level === 'CATEGORY');
    return categoryLevel.length > 0 ? categoryLevel : all.filter((c) => c.level === 'SUPER');
  }, [all]);

  const nameById = useMemo(() => new Map(all.map((c) => [c.id, c.name])), [all]);
  const nameOf = (club: { category_id?: string | null; super_category_id?: string | null }) => {
    if (club.category_id && nameById.has(club.category_id)) return nameById.get(club.category_id) ?? null;
    if (club.super_category_id && nameById.has(club.super_category_id)) {
      return nameById.get(club.super_category_id) ?? null;
    }
    return null;
  };

  return { buttons, nameOf };
}
