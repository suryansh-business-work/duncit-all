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

// A pod is "previous" once its start date/time has passed (bug 8).
const isPastPod = (p: HomePod) =>
  !!p.pod_date_time && new Date(p.pod_date_time).getTime() < Date.now();

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
  const allChips = data?.categories ?? [];

  const clubsById = new Map(clubs.map((c) => [c.id, c]));
  // Virtual pods are location-independent — keep them under the Super Category
  // regardless of the selected city (bug 10).
  const inScope = (p: HomePod) => {
    const club = clubsById.get(p.club_id);
    if (selectedSuperId && club?.super_category_id !== selectedSuperId) return false;
    const isVirtual = p.pod_mode === 'VIRTUAL';
    if (selectedLocationId && !isVirtual && p.location_id !== selectedLocationId) return false;
    return true;
  };
  const pods = allPods.filter((p) => {
    if (!inScope(p)) return false;
    const club = clubsById.get(p.club_id);
    if (selectedCategoryId && club?.category_id !== selectedCategoryId) return false;
    return true;
  });

  // Only show vibe chips for categories that actually have pods here (bug 6).
  const podCategoryIds = new Set(
    allPods.filter(inScope).map((p) => clubsById.get(p.club_id)?.category_id),
  );
  const categoryChips = allChips.filter((c) => podCategoryIds.has(c.id));

  // Past-date pods leave the main feed and move to the Previous Pods section/page.
  const activePods = pods.filter((p) => !isPastPod(p));
  const previousPods = pods.filter(isPastPod).sort((a, b) => byDateAsc(b, a));

  const podsByClub = new Map<string, HomePod[]>();
  activePods.forEach((p) => {
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

  const featuredPods = activePods.slice().sort(byDateAsc).slice(0, 6);

  return {
    categoryChips,
    clubsWithPods,
    featuredPods,
    previousPods,
    totalPods: activePods.length,
  };
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
    const byLocation = (p: { location_id?: string | null; pod_mode?: string | null }) =>
      !selectedLocationId || p.pod_mode === 'VIRTUAL' || p.location_id === selectedLocationId;
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
