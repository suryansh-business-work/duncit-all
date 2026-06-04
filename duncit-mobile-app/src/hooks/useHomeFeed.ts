import { useEffect, useMemo } from 'react';

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
function deriveHome(data: HomeFeed | undefined, selectedCategoryId: string) {
  const clubs = data?.clubs ?? [];
  const allPods = data?.pods ?? [];
  const categoryChips = data?.categories ?? [];

  const clubsById = new Map(clubs.map((c) => [c.id, c]));
  const pods = selectedCategoryId
    ? allPods.filter((p) => clubsById.get(p.club_id)?.category_id === selectedCategoryId)
    : allPods;

  const podsByClub = new Map<string, HomePod[]>();
  pods.forEach((p) => {
    const list = podsByClub.get(p.club_id) ?? [];
    list.push(p);
    podsByClub.set(p.club_id, list);
  });
  podsByClub.forEach((list) => list.sort(byDateAsc));

  const clubsWithPods: ClubWithPods[] = clubs
    .filter((c) => (podsByClub.get(c.id)?.length ?? 0) > 0)
    .map((club) => ({ club, pods: podsByClub.get(club.id) ?? [] }));

  const featuredPods = pods.slice().sort(byDateAsc).slice(0, 6);

  return { categoryChips, clubsWithPods, featuredPods, totalPods: pods.length };
}

/** Ensures the home feed is loaded and exposes its raw lists — shared by the
 * Explore (all pods), Clubs (all clubs) and Following tabs. */
export function useHomeData() {
  const data = useHomeStore((s) => s.data);
  const isLoading = useHomeStore((s) => s.isLoading);
  const fetch = useHomeStore((s) => s.fetch);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    isLoading,
    hasData: !!data,
    refetch: () => fetch(true),
    clubs: data?.clubs ?? [],
    pods: data?.pods ?? [],
    categories: data?.categories ?? [],
  };
}

/** Fetches the home feed (auth) and returns the derived shell sections. */
export function useHomeFeed(selectedCategoryId: string) {
  const data = useHomeStore((s) => s.data);
  const isLoading = useHomeStore((s) => s.isLoading);
  const error = useHomeStore((s) => s.error);
  const fetch = useHomeStore((s) => s.fetch);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const derived = useMemo(() => deriveHome(data, selectedCategoryId), [data, selectedCategoryId]);

  return { isLoading, error, hasData: !!data, refetch: () => fetch(true), ...derived };
}
