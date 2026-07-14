import { useCallback } from 'react';
import { useQuery } from '@apollo/client';
import {
  APPROVED_VENUES,
  CLUBS,
  FINANCE_FOR_PODS,
  INVENTORY_PRODUCTS,
  LOCATIONS,
  USERS,
} from './queries';

/** Lookup datasets shared by the pods table (name columns) and the pod dialogs. */
export default function usePodPageData() {
  const { data: clubsData } = useQuery(CLUBS);
  const { data: locsData } = useQuery(LOCATIONS);
  const { data: venuesData } = useQuery(APPROVED_VENUES);
  const { data: inventoryData } = useQuery(INVENTORY_PRODUCTS);
  const { data: usersData } = useQuery(USERS);
  const { data: financeData } = useQuery(FINANCE_FOR_PODS, { fetchPolicy: 'cache-first' });

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

  return {
    clubs,
    locations,
    approvedVenues,
    inventoryProducts: inventoryData?.inventoryProducts ?? [],
    users: usersData?.users ?? [],
    finance: financeData?.publicFinanceSettings,
    clubName,
    locName,
    venueName,
  };
}
