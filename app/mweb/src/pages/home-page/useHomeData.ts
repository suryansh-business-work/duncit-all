import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { splitPodsByPhase } from '@duncit/utils';
import { HEADER_DATA, HOME_REFRESH_EVENT } from '../../components/app-header/queries';
import { useFollowedClubs } from '../../hooks/useFollowedClubs';
import { HOME_STATIC, HOME_LIVE, FOLLOWED_USERS, PriceFilter, DateFilter, SortBy } from './queries';

interface UseHomeDataParams {
  superCategorySlug: string;
  locationId: string;
  zoneName: string;
  categoryId: string;
  priceFilter: PriceFilter;
  dateFilter: DateFilter;
  sortBy: SortBy;
}

type IsDescendantOf = (childId: string | null | undefined, ancestorId: string) => boolean;

interface DateBounds {
  today0: Date;
  tomorrow0: Date;
  dayAfter0: Date;
  weekEnd: Date;
  monthEnd: Date;
}

function computeDateBounds(): DateBounds {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const tomorrow0 = new Date(today0);
  tomorrow0.setDate(today0.getDate() + 1);
  const dayAfter0 = new Date(today0);
  dayAfter0.setDate(today0.getDate() + 2);
  const weekEnd = new Date(today0);
  weekEnd.setDate(today0.getDate() + 7);
  const monthEnd = new Date(today0);
  monthEnd.setMonth(today0.getMonth() + 1);
  return { today0, tomorrow0, dayAfter0, weekEnd, monthEnd };
}

function matchesSuperCategory(
  club: any,
  selectedSuperId: string | null,
  catSuperMap: Map<string, string | null>,
  superCategorySlug: string
): boolean {
  if (!selectedSuperId) return true;
  if (club.super_category_id) return club.super_category_id === selectedSuperId;
  return catSuperMap.get(club.category_id) === superCategorySlug;
}

function matchesCategory(club: any, categoryId: string, isDescendantOf: IsDescendantOf): boolean {
  if (!categoryId) return true;
  if (!club.category_id) return false;
  if (club.category_id === categoryId) return true;
  return (
    isDescendantOf(club.category_id, categoryId) || isDescendantOf(categoryId, club.category_id)
  );
}

function matchesPrice(pod: any, priceFilter: PriceFilter): boolean {
  if (priceFilter === 'ALL') return true;
  return pod.pod_type === priceFilter;
}

function matchesDate(pod: any, dateFilter: DateFilter, b: DateBounds): boolean {
  if (dateFilter === 'ALL') return true;
  if (!pod.pod_date_time) return false;
  const dt = new Date(pod.pod_date_time);
  if (dateFilter === 'TODAY') return dt >= b.today0 && dt < b.tomorrow0;
  if (dateFilter === 'TOMORROW') return dt >= b.tomorrow0 && dt < b.dayAfter0;
  if (dateFilter === 'WEEK') return dt >= b.today0 && dt < b.weekEnd;
  if (dateFilter === 'MONTH') return dt >= b.today0 && dt < b.monthEnd;
  return true;
}

/** True when a chip (or any of its descendants) has at least one pod in context. */
function makeChipHasPods(podCategoryIds: Set<string>, isDescendantOf: IsDescendantOf) {
  return (chipId: string) => {
    for (const cid of podCategoryIds) {
      if (cid === chipId || isDescendantOf(cid, chipId)) return true;
    }
    return false;
  };
}

export function useHomeData({
  superCategorySlug,
  locationId,
  zoneName,
  categoryId,
  priceFilter,
  dateFilter,
  sortBy,
}: UseHomeDataParams) {
  // The catalogue half: cacheable server-side, and unaffected by the location
  // filters, so it is fetched once and reused as the user moves around.
  const {
    data: staticData,
    loading: staticLoading,
    error: staticError,
    refetch: refetchStatic,
  } = useQuery<any>(HOME_STATIC, { fetchPolicy: 'cache-and-network' });

  const {
    data: liveData,
    loading: liveLoading,
    error: liveError,
    refetch: refetchLive,
  } = useQuery<any>(HOME_LIVE, {
    variables: {
      podFilter: {
        location_id: locationId || undefined,
        zone_name: zoneName || undefined,
        is_active: true,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  // Merged back into the single object every derivation below already reads, so
  // splitting the request changed the transport and nothing else. Undefined
  // until at least one half has landed — the skeleton keys off that.
  const data = useMemo(() => {
    if (!staticData && !liveData) return undefined;
    return { ...staticData, ...liveData };
  }, [staticData, liveData]);

  const loading = staticLoading || liveLoading;
  const error = liveError ?? staticError;

  const refetch = useCallback(
    async () => {
      await Promise.all([refetchStatic(), refetchLive()]);
    },
    [refetchStatic, refetchLive],
  );

  // A header-logo tap while already on Home re-fetches the feed (bug: logo did nothing).
  useEffect(() => {
    const onRefresh = () => {
      refetch().catch(() => undefined);
    };
    globalThis.addEventListener(HOME_REFRESH_EVENT, onRefresh);
    return () => globalThis.removeEventListener(HOME_REFRESH_EVENT, onRefresh);
  }, [refetch]);

  const { data: headerData } = useQuery<any>(HEADER_DATA, { fetchPolicy: 'cache-first' });
  const isHost = (headerData?.me?.roles ?? []).includes('HOST');
  const { ids: followedClubIds } = useFollowedClubs();
  const followingUserIds: string[] = headerData?.me?.following_user_ids ?? [];
  const { data: followedUsersData } = useQuery<any>(FOLLOWED_USERS, {
    variables: { userIds: followingUserIds },
    skip: followingUserIds.length === 0,
    fetchPolicy: 'cache-and-network',
  });

  const catSuperMap = useMemo(() => {
    const cats = data?.categories ?? [];
    const byId = new Map<string, any>();
    cats.forEach((c: any) => byId.set(c.id, c));
    const memo = new Map<string, string | null>();
    const walk = (id: string | null | undefined): string | null => {
      if (!id) return null;
      if (memo.has(id)) return memo.get(id)!;
      const node = byId.get(id);
      if (!node) {
        memo.set(id, null);
        return null;
      }
      if (node.level === 'SUPER') {
        memo.set(id, node.slug);
        return node.slug;
      }
      const up = walk(node.parent_id);
      memo.set(id, up);
      return up;
    };
    const out = new Map<string, string | null>();
    cats.forEach((c: any) => out.set(c.id, walk(c.id)));
    return out;
  }, [data]);

  const selectedSuperId = useMemo(() => {
    if (!superCategorySlug) return null;
    const cat = (data?.categories ?? []).find(
      (c: any) => c.level === 'SUPER' && c.slug === superCategorySlug
    );
    return cat?.id ?? null;
  }, [data, superCategorySlug]);

  const catParent = useMemo(() => {
    const m = new Map<string, string | null>();
    (data?.categories ?? []).forEach((c: any) => m.set(c.id, c.parent_id ?? null));
    return m;
  }, [data]);

  const isDescendantOf = useMemo(() => {
    return (childId: string | null | undefined, ancestorId: string): boolean => {
      let cur: string | null | undefined = childId;
      let guard = 0;
      while (cur && guard++ < 16) {
        if (cur === ancestorId) return true;
        cur = catParent.get(cur) ?? null;
      }
      return false;
    };
  }, [catParent]);

  const filteredPods = useMemo(() => {
    const all = data?.pods ?? [];
    const clubsById = new Map<string, any>();
    (data?.clubs ?? []).forEach((c: any) => clubsById.set(c.id, c));

    const bounds = computeDateBounds();

    return all.filter((p: any) => {
      const club = clubsById.get(p.club_id);
      if (!club) return false;
      if (!matchesSuperCategory(club, selectedSuperId, catSuperMap, superCategorySlug)) return false;
      if (!matchesCategory(club, categoryId, isDescendantOf)) return false;
      if (!matchesPrice(p, priceFilter)) return false;
      return matchesDate(p, dateFilter, bounds);
    });
  }, [
    data,
    selectedSuperId,
    catSuperMap,
    superCategorySlug,
    categoryId,
    priceFilter,
    dateFilter,
    isDescendantOf,
  ]);

  // Three time buckets, one pass, one clock read: a pod that is RUNNING right
  // now is neither upcoming nor previous — it belongs to the Ongoing rail, and
  // only drops into Previous Pods once its end time has passed. The rule lives
  // in @duncit/utils so the native twin (useHomeFeed deriveHome) reads it too.
  const phases = useMemo(() => splitPodsByPhase<any>(filteredPods), [filteredPods]);
  // Date-ASC like the native twin, so the Happening nearby page shows the same
  // order as the home rail and a "See all" continuation (?from=N) lands right
  // after the rail's last card.
  const activePods = useMemo(
    () =>
      phases.upcoming
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(a.pod_date_time || 0).getTime() - new Date(b.pod_date_time || 0).getTime()
        ),
    [phases]
  );
  // Earliest start first, so the pod that has been running longest leads the
  // rail — the same date-ASC reading the other two rails give.
  const ongoingPods = useMemo(
    () =>
      phases.ongoing
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(a.pod_date_time || 0).getTime() - new Date(b.pod_date_time || 0).getTime()
        ),
    [phases]
  );
  const previousPods = useMemo(
    () =>
      phases.previous
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(b.pod_date_time || 0).getTime() - new Date(a.pod_date_time || 0).getTime()
        ),
    [phases]
  );

  const podsByClub = useMemo(() => {
    const map = new Map<string, any[]>();
    activePods.forEach((p: any) => {
      const list = map.get(p.club_id) ?? [];
      list.push(p);
      map.set(p.club_id, list);
    });
    const cmp = (a: any, b: any) => {
      switch (sortBy) {
        case 'DATE_ASC':
          return (
            new Date(a.pod_date_time || 0).getTime() -
            new Date(b.pod_date_time || 0).getTime()
          );
        case 'DATE_DESC':
          return (
            new Date(b.pod_date_time || 0).getTime() -
            new Date(a.pod_date_time || 0).getTime()
          );
        case 'PRICE_ASC':
          return (Number(a.pod_amount) || 0) - (Number(b.pod_amount) || 0);
        case 'PRICE_DESC':
          return (Number(b.pod_amount) || 0) - (Number(a.pod_amount) || 0);
      }
    };
    map.forEach((arr) => {
      arr.sort(cmp);
    });
    return map;
  }, [activePods, sortBy]);

  const featuredPods = useMemo(() => {
    return activePods
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(a.pod_date_time || 0).getTime() - new Date(b.pod_date_time || 0).getTime()
      )
      .slice(0, 10);
  }, [activePods]);

  const hostNameById = useMemo(() => {
    const map = new Map<string, string>();
    (data?.publicHosts ?? []).forEach((h: any) => {
      if (h?.user_id && h.full_name) map.set(h.user_id, h.full_name);
    });
    return map;
  }, [data?.publicHosts]);

  // Stable identity: the pod-list page keys memos on this (a fresh closure per
  // render would cancel its jump-correction timer on every parent re-render).
  const hostNameOf = useCallback(
    (p: any): string | null => {
      if (Array.isArray(p.host_names) && p.host_names.length > 0) {
        return p.host_names.join(', ');
      }
      const ids: string[] = p.pod_hosts_id ?? [];
      for (const id of ids) {
        const n = hostNameById.get(id);
        if (n) return n;
      }
      return null;
    },
    [hostNameById]
  );

  // The pod card's category chip (mock: "Sports" over the image) — the pod's
  // club's CATEGORY name, resolved through the same catalogue the vibe chips use.
  const clubCategoryNameById = useMemo(() => {
    const nameById = new Map<string, string>();
    (data?.categories ?? []).forEach((c: any) => nameById.set(c.id, c.name));
    const m = new Map<string, string>();
    (data?.clubs ?? []).forEach((club: any) => {
      const name = club.category_id ? nameById.get(club.category_id) : undefined;
      if (name) m.set(club.id, name);
    });
    return m;
  }, [data]);
  const categoryLabelOf = useCallback(
    (p: any): string | null => clubCategoryNameById.get(p.club_id) ?? null,
    [clubCategoryNameById]
  );

  // Category ids that actually have at least one pod in the current location /
  // super-category context — used to hide vibe chips that would show nothing.
  const podCategoryIds = useMemo(() => {
    const clubsById = new Map<string, any>();
    (data?.clubs ?? []).forEach((c: any) => clubsById.set(c.id, c));
    const ids = new Set<string>();
    (data?.pods ?? []).forEach((p: any) => {
      const club = clubsById.get(p.club_id);
      if (!club) return;
      if (selectedSuperId) {
        const ok = club.super_category_id
          ? club.super_category_id === selectedSuperId
          : catSuperMap.get(club.category_id) === superCategorySlug;
        if (!ok) return;
      }
      if (club.category_id) ids.add(club.category_id);
    });
    return ids;
  }, [data, selectedSuperId, catSuperMap, superCategorySlug]);

  const categoryChips = useMemo(() => {
    const cats = data?.categories ?? [];
    const chipHasPods = makeChipHasPods(podCategoryIds, isDescendantOf);
    if (!selectedSuperId) {
      return cats
        .filter((c: any) => (c.level === 'CATEGORY' || c.level === 'SUB') && chipHasPods(c.id))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    }
    const descendants = cats.filter(
      (c: any) =>
        (c.level === 'CATEGORY' || c.level === 'SUB') &&
        isDescendantOf(c.id, selectedSuperId)
    );
    const categories = descendants
      .filter((c: any) => c.level === 'CATEGORY')
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    const subsByParent = new Map<string, any[]>();
    descendants
      .filter((c: any) => c.level === 'SUB')
      .forEach((s: any) => {
        const arr = subsByParent.get(s.parent_id) ?? [];
        arr.push(s);
        subsByParent.set(s.parent_id, arr);
      });
    subsByParent.forEach((arr) => {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    });
    const ordered: any[] = [];
    categories.forEach((c: any) => {
      ordered.push(c);
      (subsByParent.get(c.id) ?? []).forEach((s: any) => ordered.push(s));
      subsByParent.delete(c.id);
    });
    subsByParent.forEach((arr) => arr.forEach((s) => ordered.push(s)));
    return ordered.filter((c: any) => chipHasPods(c.id));
  }, [data, selectedSuperId, isDescendantOf, podCategoryIds]);

  // Structured two-row "What's your vibe": CATEGORY-level chips (row 1), each
  // carrying its SUB-category chips (row 2, shown when the category is picked).
  // Only categories/subs that actually have pods appear — unless the admin's
  // "show all categories on Home" toggle is on, which shows every category.
  const showAllVibes = headerData?.branding?.home_show_all_vibe_categories === true;
  const vibeCategories = useMemo(() => {
    const cats = data?.categories ?? [];
    const chipHasPods = makeChipHasPods(podCategoryIds, isDescendantOf);
    const inScope = (c: any) => !selectedSuperId || isDescendantOf(c.id, selectedSuperId);
    // When the admin toggle is on, show every category/sub (with its icon) even
    // ones with no pods yet; otherwise only those that currently have pods.
    const isVisible = (c: any) => showAllVibes || chipHasPods(c.id);
    const categories = cats
      .filter((c: any) => c.level === 'CATEGORY' && inScope(c) && isVisible(c))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    const subsByParent = new Map<string, any[]>();
    cats
      // inScope here too: without it every SUB in the catalogue is bucketed
      // whenever the admin toggle is on, and only the parent lookup below keeps
      // the out-of-super ones off screen. Same rule on both branches (rule 27).
      .filter((c: any) => c.level === 'SUB' && inScope(c) && isVisible(c))
      .forEach((s: any) => {
        const arr = subsByParent.get(s.parent_id) ?? [];
        arr.push(s);
        subsByParent.set(s.parent_id, arr);
      });
    subsByParent.forEach((arr) => {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    });
    return categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon ?? null,
      iconLayout: c.icon_layout_mweb ?? null,
      subs: (subsByParent.get(c.id) ?? []).map((s: any) => ({ id: s.id, name: s.name, icon: s.icon ?? null })),
    }));
  }, [data, selectedSuperId, isDescendantOf, podCategoryIds, showAllVibes]);

  const clubs = useMemo(() => {
    const all = data?.clubs ?? [];
    return all.filter((c: any) => (podsByClub.get(c.id)?.length ?? 0) > 0);
  }, [data, podsByClub]);

  const followedClubSet = useMemo(() => new Set(followedClubIds), [followedClubIds]);
  const followedClubs = useMemo(() => {
    const all = data?.clubs ?? [];
    return all
      .filter((club: any) => followedClubSet.has(club.id))
      .filter((club: any) => !selectedSuperId || club.super_category_id === selectedSuperId)
      .slice(0, 12);
  }, [data, followedClubSet, selectedSuperId]);

  const hostPods = useMemo(() => {
    const meId = headerData?.me?.user_id;
    if (!meId) return [];
    return filteredPods
      .filter((pod: any) => (pod.pod_hosts_id ?? []).includes(meId))
      .slice(0, 12);
  }, [filteredPods, headerData?.me?.user_id]);

  const followedPosts = useMemo(() => {
    const userIds = new Set(followingUserIds);
    // A club-attached story belongs to its club's ring, not its author's.
    return (data?.stories ?? [])
      .filter((post: any) => !post.club_id && userIds.has(post.author_id))
      .slice(0, 36);
  }, [data?.stories, followingUserIds]);

  /** Live stories attached to a club — the source of the rail's club rings. */
  const clubStories = useMemo(
    () => (data?.stories ?? []).filter((post: any) => !!post.club_id),
    [data?.stories],
  );

  // All of my own active (non-expired) stories, newest first — the rail groups
  // them as add-on slides instead of letting a new upload overwrite the old one.
  const myStories = useMemo(() => {
    const meId = headerData?.me?.user_id;
    return (data?.stories ?? []).filter((post: any) => meId && post.author_id === meId);
  }, [data?.stories, headerData?.me?.user_id]);

  return {
    data,
    loading,
    error,
    refetch,
    branding: headerData?.branding,
    me: headerData?.me,
    locations: headerData?.locations ?? [],
    isHost,
    clubs,
    featuredPods,
    podsByClub,
    categoryChips,
    vibeCategories,
    followedClubs,
    hostPods,
    followedPosts,
    clubStories,
    myStories,
    followedUsers: followedUsersData?.publicUsersByIds ?? [],
    totalPods: activePods.length,
    activePods,
    ongoingPods,
    previousPods,
    hostNameOf,
    categoryLabelOf,
  };
}
