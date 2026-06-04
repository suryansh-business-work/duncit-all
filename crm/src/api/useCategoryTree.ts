import { useQuery } from '@apollo/client';
import { CATEGORIES_BY_PARENT, type CategoryOption } from './data.gql';

export type CategoryLevel = 'SUPER' | 'CATEGORY' | 'SUB';

/**
 * Active categories at a level, scoped to a parent — the building block for the
 * cascading Super → Category → Sub pickers. Non-SUPER levels are skipped until a
 * parent is chosen so we never fetch an unscoped list.
 */
export function useCategoriesByParent(level: CategoryLevel, parentId?: string | null) {
  const skip = level !== 'SUPER' && !parentId;
  const { data, loading } = useQuery<{ categories: CategoryOption[] }>(CATEGORIES_BY_PARENT, {
    variables: { level, parent_id: parentId ?? null },
    skip,
    fetchPolicy: 'cache-and-network',
  });
  const options = (data?.categories ?? [])
    .filter((c) => c.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return { options, loading };
}
