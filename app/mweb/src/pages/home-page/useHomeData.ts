import { useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { HEADER_DATA, HOME_REFRESH_EVENT } from '../../components/app-header/queries';
import { useFollowedClubs } from '../../hooks/useFollowedClubs';
import { HOME_DATA, FOLLOWED_USERS, PriceFilter, DateFilter, SortBy } from './queries';

interface UseHomeDataParams {
  superCategorySlug: string;
  locationId: string;
  zoneName: string;
  categoryId: string;
  priceFilter: PriceFilter;
  dateFilter: DateFilter;
  sortBy: SortBy;
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
  const { data, loading, error, refetch } = useQuery(HOME_DATA, {
    variables: {
      podFilter: {
        location_id: locationId || undefined,
        zone_name: zoneName || undefined,
        is_active: true,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  // A header-logo tap while already on Home re-fetches the feed (bug: logo did nothing).
  useEffect(() => {
    const onRefresh = () => {
      refetch().catch(() => undefined);
    };
    window.addEventListener(HOME_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(HOME_REFRESH_EVENT, onRefresh);
  }, [refetch]);

  const { data: headerData } = useQuery(HEADER_DATA, { fetchPolicy: 'cache-first' });
  const isHost = (headerData?.me?.roles ?? []).includes('HOST');
  const { ids: followedClubIds } = useFollowedClubs();
  const followingPodIds: string[] = headerData?.me?.following_pod_ids ?? [];
  const followingUserIds: string[] = headerData?.me?.following_user_ids ?? [];
  const { data: followedUsersData } = useQuery(FOLLOWED_USERS, {
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

    const now = new Date();
    const startOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const today0 = startOfDay(now);
    const tomorrow0 = new Date(today0);
    tomorrow0.setDate(today0.getDate() + 1);
    const dayAfter0 = new Date(today0);
    dayAfter0.setDate(today0.getDate() + 2);
    const weekEnd = new Date(today0);
    weekEnd.setDate(today0.getDate() + 7);
    const monthEnd = new Date(today0);
    monthEnd.setMonth(today0.getMonth() + 1);

    return all.filter((p: any) => {
      const club = clubsById.get(p.club_id);
      if (!club) return false;

      if (selectedSuperId) {
        const ok = club.super_category_id
          ? club.super_category_id === selectedSuperId
          : catSuperMap.get(club.category_id) === superCategorySlug;
        if (!ok) return false;
      }

      if (categoryId) {
        if (!club.category_id) return false;
        const same = club.category_id === categoryId;
        const chipIsAncestorOfClub = isDescendantOf(club.category_id, categoryId);
        const chipIsDescendantOfClub = isDescendantOf(categoryId, club.category_id);
        if (!same && !chipIsAncestorOfClub && !chipIsDescendantOfClub) return false;
      }

      if (priceFilter !== 'ALL') {
        const t = p.pod_type as string;
        if (priceFilter === 'FREE' && !t?.includes('FREE')) return false;
        if (priceFilter === 'PAID' && !(t === 'NATIVE_PAID' || t === 'NON_NATIVE_PAID'))
          return false;
        if (priceFilter === 'PREMIUM' && t !== 'NATIVE_PAID_PREMIUM') return false;
      }

      if (dateFilter !== 'ALL') {
        if (!p.pod_date_time) return false;
        const dt = new Date(p.pod_date_time);
        if (dateFilter === 'TODAY' && !(dt >= today0 && dt < tomorrow0)) return false;
        if (dateFilter === 'TOMORROW' && !(dt >= tomorrow0 && dt < dayAfter0)) return false;
        if (dateFilter === 'WEEK' && !(dt >= today0 && dt < weekEnd)) return false;
        if (dateFilter === 'MONTH' && !(dt >= today0 && dt < monthEnd)) return false;
      }

      return true;
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

  // A pod is "previous" once its start date/time has passed — it leaves the main
  // feed and moves to the Previous Pods section/page (bug 8).
  const isPastPod = (p: any) =>
    !!p.pod_date_time && new Date(p.pod_date_time).getTime() < Date.now();
  const activePods = useMemo(() => filteredPods.filter((p: any) => !isPastPod(p)), [filteredPods]);
  const previousPods = useMemo(
    () =>
      filteredPods
        .filter(isPastPod)
        .sort(
          (a: any, b: any) =>
            new Date(b.pod_date_time || 0).getTime() - new Date(a.pod_date_time || 0).getTime()
        ),
    [filteredPods]
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
    map.forEach((arr) => arr.sort(cmp));
    return map;
  }, [activePods, sortBy]);

  const featuredPods = useMemo(() => {
    return activePods
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(a.pod_date_time || 0).getTime() - new Date(b.pod_date_time || 0).getTime()
      )
      .slice(0, 6);
  }, [activePods]);

  const hostNameById = useMemo(() => {
    const map = new Map<string, string>();
    (data?.publicHosts ?? []).forEach((h: any) => {
      if (h?.user_id && h.full_name) map.set(h.user_id, h.full_name);
    });
    return map;
  }, [data?.publicHosts]);

  const hostNameOf = (p: any): string | null => {
    if (Array.isArray(p.host_names) && p.host_names.length > 0) {
      return p.host_names.join(', ');
    }
    const ids: string[] = p.pod_hosts_id ?? [];
    for (const id of ids) {
      const n = hostNameById.get(id);
      if (n) return n;
    }
    return null;
  };

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
    const chipHasPods = (chipId: string) => {
      for (const cid of podCategoryIds) {
        if (cid === chipId || isDescendantOf(cid, chipId)) return true;
      }
      return false;
    };
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
    subsByParent.forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
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
  // Only categories/subs that actually have pods in the current context appear.
  const vibeCategories = useMemo(() => {
    const cats = data?.categories ?? [];
    const chipHasPods = (chipId: string) => {
      for (const cid of podCategoryIds) {
        if (cid === chipId || isDescendantOf(cid, chipId)) return true;
      }
      return false;
    };
    const inScope = (c: any) => !selectedSuperId || isDescendantOf(c.id, selectedSuperId);
    const categories = cats
      .filter((c: any) => c.level === 'CATEGORY' && inScope(c) && chipHasPods(c.id))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    const subsByParent = new Map<string, any[]>();
    cats
      .filter((c: any) => c.level === 'SUB' && chipHasPods(c.id))
      .forEach((s: any) => {
        const arr = subsByParent.get(s.parent_id) ?? [];
        arr.push(s);
        subsByParent.set(s.parent_id, arr);
      });
    subsByParent.forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      subs: (subsByParent.get(c.id) ?? []).map((s: any) => ({ id: s.id, name: s.name })),
    }));
  }, [data, selectedSuperId, isDescendantOf, podCategoryIds]);

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

  const followedPodSet = useMemo(() => new Set(followingPodIds), [followingPodIds]);
  const followedPods = useMemo(
    () => filteredPods.filter((pod: any) => followedPodSet.has(pod.id)).slice(0, 12),
    [filteredPods, followedPodSet]
  );

  const hostPods = useMemo(() => {
    const meId = headerData?.me?.user_id;
    if (!meId) return [];
    return filteredPods
      .filter((pod: any) => (pod.pod_hosts_id ?? []).includes(meId))
      .slice(0, 12);
  }, [filteredPods, headerData?.me?.user_id]);

  const followedPosts = useMemo(() => {
    const userIds = new Set(followingUserIds);
    return (data?.stories ?? []).filter((post: any) => userIds.has(post.author_id)).slice(0, 36);
  }, [data?.stories, followingUserIds]);

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
    isHost,
    clubs,
    featuredPods,
    podsByClub,
    categoryChips,
    vibeCategories,
    followedClubs,
    followedPods,
    hostPods,
    followedPosts,
    myStories,
    followedUsers: followedUsersData?.publicUsersByIds ?? [],
    totalPods: activePods.length,
    activePods,
    previousPods,
    hostNameOf,
  };
}
