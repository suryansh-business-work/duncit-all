import { useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { ADMIN_CATEGORIES, type CategoryDoc } from '@duncit/category';
import {
  APPROVED_HOSTS,
  APPROVED_VENUES,
  CLUBS,
  FINANCE_FOR_PODS,
  INVENTORY_PRODUCTS,
  LOCATIONS,
  USERS,
} from './queries';

/** Lookup datasets shared by the pods table (name columns) and the pod dialogs. */
export default function usePodPageData() {
  const { data: clubsData } = useQuery<any>(CLUBS);
  const { data: locsData } = useQuery<any>(LOCATIONS);
  const { data: venuesData } = useQuery<any>(APPROVED_VENUES);
  const { data: inventoryData } = useQuery<any>(INVENTORY_PRODUCTS);
  const { data: usersData } = useQuery<any>(USERS);
  const { data: approvedHostsData } = useQuery<any>(APPROVED_HOSTS);
  const { data: financeData } = useQuery<any>(FINANCE_FOR_PODS, { fetchPolicy: 'cache-first' });
  const { data: categoriesData } = useQuery<{ categories: CategoryDoc[] }>(ADMIN_CATEGORIES, {
    fetchPolicy: 'cache-first',
  });

  const clubs = clubsData?.clubs ?? [];
  const locations = locsData?.locations ?? [];
  const approvedVenues = venuesData?.venues ?? [];

  const clubName = useCallback(
    (id: string) => (clubsData?.clubs ?? []).find((c: any) => c.id === id)?.club_name ?? '—',
    [clubsData],
  );
  const locName = useCallback(
    (id: string) => (locsData?.locations ?? []).find((l: any) => l.id === id)?.location_name ?? '—',
    [locsData],
  );
  const venueName = useCallback(
    (id: string) => (venuesData?.venues ?? []).find((v: any) => v.id === id)?.venue_name ?? '—',
    [venuesData],
  );
  /** The club's activity floor: its sub-category's `min_pax` (0 = none). */
  const minPax = useCallback(
    (clubId: string) => {
      const subId = (clubsData?.clubs ?? []).find((c: any) => c.id === clubId)?.category_id;
      return (categoriesData?.categories ?? []).find((c) => c.id === subId)?.min_pax ?? 0;
    },
    [clubsData, categoriesData],
  );

  return {
    clubs,
    locations,
    /** The admin category tree — the All Pods category filter resolves clubs from it. */
    categories: categoriesData?.categories ?? [],
    approvedVenues,
    inventoryProducts: inventoryData?.inventoryProducts ?? [],
    users: usersData?.users ?? [],
    /** Host-column options for the pod form. `users` above stays the full
     * directory — the complete-pod dialog labels historical hosts from it. */
    approvedHosts: approvedHostsData?.hosts ?? [],
    finance: financeData?.publicFinanceSettings,
    clubName,
    locName,
    venueName,
    minPax,
  };
}
