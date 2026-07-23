import { useEffect, useMemo } from 'react';

import { useLocations } from '@/hooks/useLocations';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { useHomeStore, type HomeFeed } from '@/stores/home.store';
import { makeCategoryMatcher } from '@/utils/category-match';
import {
  DEFAULT_HOME_FILTERS,
  comparePods,
  matchesDate,
  matchesPrice,
  type HomeFilters,
} from '@/utils/home-filters';

export type HomeCategory = HomeFeed['categories'][number];
export type HomeClub = HomeFeed['clubs'][number];
export type HomePod = HomeFeed['pods'][number];

export interface ClubWithPods {
  club: HomeClub;
  pods: HomePod[];
}

export interface VibeSub {
  id: string;
  name: string;
  icon?: string;
}
/** CATEGORY-level icon placement + size for the vibe tabber (server default when
 * null: position TOP, 40x40 — the icon-over-label look). */
export interface VibeIconLayout {
  position: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
  width: number;
  height: number;
}
export interface VibeCategory {
  id: string;
  name: string;
  icon?: string;
  iconLayout?: VibeIconLayout | null;
  subs: VibeSub[];
}

/** Structured two-row vibe filter: CATEGORY chips, each carrying its SUB chips.
 * Only categories/subs that actually have pods (directly or via a descendant)
 * in the current scope are kept. */
function deriveVibeCategories(
  allChips: HomeCategory[],
  podCategoryIds: Set<string | null | undefined>,
): VibeCategory[] {
  const parentById = new Map(allChips.map((c) => [c.id, c.parent_id ?? null]));
  const isDescendant = (childId: string, ancestorId: string) => {
    let cur: string | null | undefined = childId;
    let guard = 0;
    while (cur && guard++ < 16) {
      if (cur === ancestorId) return true;
      cur = parentById.get(cur) ?? null;
    }
    return false;
  };
  const chipHasPods = (chipId: string) => {
    for (const cid of podCategoryIds) {
      if (cid && (cid === chipId || isDescendant(cid, chipId))) return true;
    }
    return false;
  };
  const categories = allChips
    .filter((c) => c.level === 'CATEGORY' && chipHasPods(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const subsByParent = new Map<string, HomeCategory[]>();
  allChips
    .filter((c) => c.level === 'SUB' && chipHasPods(c.id))
    .forEach((s) => {
      const key = s.parent_id ?? '';
      const arr = subsByParent.get(key) ?? [];
      arr.push(s);
      subsByParent.set(key, arr);
    });
  subsByParent.forEach((arr) => {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon ?? undefined,
    iconLayout: c.icon_layout_native ?? null,
    subs: (subsByParent.get(c.id) ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon ?? undefined,
    })),
  }));
}

const byDateAsc = (a: HomePod, b: HomePod) =>
  new Date(a.pod_date_time || 0).getTime() - new Date(b.pod_date_time || 0).getTime();

// A pod is "previous" once its start date/time has passed (bug 8).
const isPastPod = (p: HomePod) =>
  !!p.pod_date_time && new Date(p.pod_date_time).getTime() < Date.now();

/** Derives the home shell sections from the raw feed. A selected vibe chip keeps
 * only pods whose club sits on the same category branch — equal/ancestor/
 * descendant — so the "All {category}" chip also keeps SUB-tagged clubs. */
function deriveHome(
  data: HomeFeed | undefined,
  selectedCategoryId: string,
  selectedSuperId: string | null,
  selectedLocationId: string,
  filters: HomeFilters,
) {
  const clubs = data?.clubs ?? [];
  const allPods = data?.pods ?? [];
  const allChips = data?.categories ?? [];

  const clubsById = new Map(clubs.map((c) => [c.id, c]));
  const matchesCategory = makeCategoryMatcher(allChips);
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
    if (!matchesCategory(club, selectedCategoryId)) return false;
    // Price/date filters from the filter sheet (bug 6).
    if (!matchesPrice(p, filters.price)) return false;
    if (!matchesDate(p.pod_date_time, filters.date)) return false;
    return true;
  });

  // Only show vibe chips for categories that actually have pods here (bug 6).
  const podCategoryIds = new Set(
    allPods.filter(inScope).map((p) => clubsById.get(p.club_id)?.category_id),
  );
  const categoryChips = allChips.filter((c) => podCategoryIds.has(c.id));
  const vibeCategories = deriveVibeCategories(allChips, podCategoryIds);
  // Whether this city/scope has any pods at all (pre category/price/date filter)
  // — drives disabling the Filter + Search controls when there's nothing to act on.
  const hasContent = allPods.some(inScope);

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
    list.sort((a, b) => comparePods(a, b, filters.sort));
  });

  const clubsWithPods: ClubWithPods[] = clubs
    .map((club) => ({ club, pods: podsByClub.get(club.id) ?? [] }))
    .filter((entry) => entry.pods.length > 0);

  const featuredPods = activePods.slice().sort(byDateAsc).slice(0, 6);

  return {
    categoryChips,
    vibeCategories,
    hasContent,
    clubsWithPods,
    featuredPods,
    activePods: activePods.slice().sort(byDateAsc),
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
export function useHomeFeed(
  selectedCategoryId: string,
  filters: HomeFilters = DEFAULT_HOME_FILTERS,
) {
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
    () => deriveHome(data, selectedCategoryId, selectedSuperId, selectedLocationId, filters),
    [data, selectedCategoryId, selectedSuperId, selectedLocationId, filters],
  );

  return { isLoading, error, hasData: !!data, refetch: () => fetch(true), ...derived };
}
