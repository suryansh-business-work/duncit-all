import { useQuery } from '@apollo/client/react';

import { STORE_NAVIGATION, type StoreCategoryNode, type StoreNavigation } from '../../graphql/settings';

const EMPTY: StoreNavigation = { pet_types: [], categories: [], collections: [], pages: [] };

/** The header's menu data, fetched once and shared by the desktop and mobile menus. */
export function useNavigationData(): StoreNavigation {
  const { data } = useQuery(STORE_NAVIGATION, { fetchPolicy: 'cache-first' });
  return data?.storeNavigation ?? EMPTY;
}

/** Menu aisles for one pet: tagged for it, or for no pet in particular. */
export function categoriesForPet(categories: StoreCategoryNode[], petTypeId: string): StoreCategoryNode[] {
  return categories.filter(
    (c) => c.show_in_menu && (c.pet_type_ids.length === 0 || c.pet_type_ids.includes(petTypeId)),
  );
}

/** Sub-aisles shown under a heading, hidden ones left out. */
export function menuChildren(node: StoreCategoryNode): StoreCategoryNode[] {
  return (node.children ?? []).filter((c) => c.show_in_menu);
}
