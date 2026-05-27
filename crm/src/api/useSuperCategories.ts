import { useQuery } from '@apollo/client';
import { SUPER_CATEGORIES } from './crm.gql';
import type { SuperCategoryOption } from './crm.types';

interface RawSuperCategory extends SuperCategoryOption {
  is_active: boolean;
  sort_order: number;
}

/**
 * Active SUPER categories sourced from the admin-managed catalogue. Returns
 * a stable shape for select dropdowns + lookups by id.
 */
export function useSuperCategories() {
  const { data, loading, error } = useQuery<{ categories: RawSuperCategory[] }>(SUPER_CATEGORIES, {
    fetchPolicy: 'cache-first',
  });
  const all = data?.categories ?? [];
  const active = all
    .filter((c) => c.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const byId = new Map(active.map((c) => [c.id, c]));
  return { options: active, byId, loading, error };
}
