import { gql, useQuery } from '@apollo/client';
import type { CategoryDoc } from './types';

/** The admin-managed category tree — the single source the picker reads from. */
export const ADMIN_CATEGORIES = gql`
  query AdminCategories {
    categories {
      id
      name
      slug
      level
      parent_id
    }
  }
`;

export function useAdminCategories() {
  const { data, loading, error } = useQuery<{ categories: CategoryDoc[] }>(ADMIN_CATEGORIES, {
    fetchPolicy: 'cache-first',
  });
  return { categories: data?.categories ?? [], loading, error };
}
