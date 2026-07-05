import { useMemo } from 'react';
import { useAdminCategories } from './queries';
import { EMPTY_CATEGORY, type AdminCategoryValue, type CategoryDoc } from './types';

/**
 * Build a full picker value from a persisted super id + sub id (the shape a Club
 * stores). The middle CATEGORY level is derived from the sub's parent_id.
 */
export function buildCategoryValue(
  categories: CategoryDoc[],
  superId: string,
  subId: string,
): AdminCategoryValue {
  const superDoc = categories.find((c) => c.id === superId);
  const subDoc = categories.find((c) => c.id === subId);
  const middleDoc = subDoc?.parent_id
    ? categories.find((c) => c.id === subDoc.parent_id)
    : undefined;
  return {
    super_id: superDoc?.id ?? superId ?? '',
    super_name: superDoc?.name ?? '',
    category_id: middleDoc?.id ?? '',
    category_name: middleDoc?.name ?? '',
    sub_id: subDoc?.id ?? '',
    sub_name: subDoc?.name ?? '',
  };
}

/** Hydrate a picker value from persisted super + sub ids (for edit forms). */
export function useCategoryValue(superId?: string | null, subId?: string | null): AdminCategoryValue {
  const { categories } = useAdminCategories();
  return useMemo(() => {
    if (!superId && !subId) return EMPTY_CATEGORY;
    return buildCategoryValue(categories, superId ?? '', subId ?? '');
  }, [categories, superId, subId]);
}
