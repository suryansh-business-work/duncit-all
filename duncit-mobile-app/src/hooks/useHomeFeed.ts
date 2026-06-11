import { useEffect, useMemo } from 'react';

import { useLocations } from '@/hooks/useLocations';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { useHomeStore, type HomeFeed } from '@/stores/home.store';

export type HomeCategory = HomeFeed['categories'][number];
export type HomeClub = HomeFeed['clubs'][number];
export type HomePod = HomeFeed['pods'][number];

export interface ClubWithPods {
  club: HomeClub;
  pods: HomePod[];
}

const byDateAsc = (a: HomePod, b: HomePod) =>
  new Date(a.pod_date_time || 0).getTime() - new Date(b.pod_date_time || 0).getTime();

/** Derives the home shell sections from the raw feed. A selected vibe chip keeps
 * only pods whose club matches that category (direct match — the deep
 * ancestor/price/date filtering from mWeb is a follow-up). */
function deriveHome(
  data: HomeFeed | undefined,
  selectedCategoryId: string,
  selectedSuperId: string | null,
  selectedLocationId: string,
) {
  const clubs = data?.clubs ?? [];
  const allPods = data?.pods ?? [];
  const categoryChips = data?.categories ?? [];

  const clubsById = new Map(clubs.map((c) => [c.id, c]));
  const pods = allPods.filter((p) => {
    const club = clubsById.get(p.club_id);
    if (selectedSuperId && club?.super_category_id !== selectedSuperId) return false;
    if (selectedCategoryId && club?.category_id !== selectedCategoryId) return false;
    if (selectedLocationId && p.location_id !== selectedLocationId) return false;
    return true;
  });

  const podsByClub = new Map<string, HomePod[]>();
  pods.forEach((p) => {
    const list = podsByClub.get(p.club_id) ?? [];
    list.push(p);
    podsByClub.set(p.club_id, list);
  });
  podsByClub.forEach((list) => {
    list.sort(byDateAsc);
  });

  const clubsWithPods: ClubWithPods[] = clubs
    .map((club) => ({ club, pods: podsByClub.get(club.id) ?? [] }))
    .filter((entry) => entry.pods.length > 0);

  const featuredPods = pods.slice().sort(byDateAsc).slice(0, 6);

  return { categoryChips, clubsWithPods, featuredPods, totalPods: pods.length };
}

/** Ensures the home feed is loaded and exposes its raw lists — shared by the
 * Explore (all pods), Clubs (all clubs) and Following tabs. */
export function useHomeData() {
  const data = useHomeStore((s) => s.data);
  const isLoading = useHomeStore((s) => s.isLoading);
  const fetch = useHomeStore((s) => s.fetch);
  const { selectedSuperId } = useSuperCategories();
  const { selectedId: selectedLocationId } = useLocations();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const { clubs, pods } = useMemo(() => {
    const allClubs = data?.clubs ?? [];
    const byLocation = (p: { location_id?: string | null }) =>
      !selectedLocationId || p.location_id === selectedLocationId;
    if (!selectedSuperId) {
      return { clubs: allClubs, pods: (data?.pods ?? []).filter(byLocation) };
    }
    const matchClubIds = new Set(
      allClubs.filter((c) => c.super_category_id === selectedSuperId).map((c) => c.id),
    );
    return {
      clubs: allClubs.filter((c) => matchClubIds.has(c.id)),
      pods: (data?.pods ?? []).filter((p) => matchClubIds.has(p.club_id) && byLocation(p)),
    };
  }, [data, selectedSuperId, selectedLocationId]);

  return {
    isLoading,
    hasData: !!data,
    refetch: () => fetch(true),
    clubs,
    pods,
    categories: data?.categories ?? [],
  };
}

/** Fetches the home feed (auth) and returns the derived shell sections. */
export function useHomeFeed(selectedCategoryId: string) {
  const data = useHomeStore((s) => s.data);
  const isLoading = useHomeStore((s) => s.isLoading);
  const error = useHomeStore((s) => s.error);
  const fetch = useHomeStore((s) => s.fetch);
  const { selectedSuperId } = useSuperCategories();
  const { selectedId: selectedLocationId } = useLocations();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const derived = useMemo(
    () => deriveHome(data, selectedCategoryId, selectedSuperId, selectedLocationId),
    [data, selectedCategoryId, selectedSuperId, selectedLocationId],
  );

  return { isLoading, error, hasData: !!data, refetch: () => fetch(true), ...derived };
}
