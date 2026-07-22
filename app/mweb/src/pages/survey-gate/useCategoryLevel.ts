import { useQuery } from '@apollo/client';
import { CATEGORIES, type CategoryLevel, type CategoryOption } from './queries';

/**
 * Active categories for one taxonomy level under a parent, sorted for display
 * (sort_order then name). Shared by the survey-gate CategoryStep and the
 * pod-idea Super → Category → Sub cascade so the fetch/sort lives in one place.
 */
export const useCategoryLevel = (level: CategoryLevel, parentId: string) => {
  const skip = level !== 'SUPER' && !parentId;
  const { data, loading } = useQuery<{ categories: CategoryOption[] }>(CATEGORIES, {
    variables: { level, parent_id: level === 'SUPER' ? null : parentId },
    skip,
    fetchPolicy: 'cache-and-network',
  });
  const options = (data?.categories ?? [])
    .filter((c) => c.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
  return { options, loading };
};
