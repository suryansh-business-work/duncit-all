import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { HEADER_DATA } from '../../components/app-header/queries';
import { HOME_DATA, PriceFilter, DateFilter, SortBy } from './queries';

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
  const { data, loading, error } = useQuery(HOME_DATA, {
    variables: {
      superCatSlug: superCategorySlug || undefined,
      podFilter: {
        location_id: locationId || undefined,
        zone_name: zoneName || undefined,
        is_active: true,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: headerData } = useQuery(HEADER_DATA, { fetchPolicy: 'cache-first' });
  const isHost = (headerData?.me?.roles ?? []).includes('HOST');

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

  const sliders = useMemo(() => {
    const list = data?.sliders ?? [];
    const map = new Map<string, any>();
    list
      .filter((s: any) => {
        if (s.scope === 'GLOBAL') return true;
        if (s.scope === 'LOCATION') return !locationId || s.location_id === locationId;
        if (s.scope === 'ZONE') {
          const locationOk = !locationId || s.location_id === locationId;
          const zoneOk = !zoneName || s.zone_name === zoneName;
          return locationOk && zoneOk;
        }
        return true;
      })
      .forEach((s: any) => map.set(s.id, s));
    return [...map.values()].sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0));
  }, [data, locationId, zoneName]);

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

  const podsByClub = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredPods.forEach((p: any) => {
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
  }, [filteredPods, sortBy]);

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

  const categoryChips = useMemo(() => {
    const cats = data?.categories ?? [];
    if (!selectedSuperId) {
      return cats
        .filter((c: any) => c.level === 'CATEGORY' || c.level === 'SUB')
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
    return ordered;
  }, [data, selectedSuperId, isDescendantOf]);

  const clubs = useMemo(() => {
    const all = data?.clubs ?? [];
    return all.filter((c: any) => (podsByClub.get(c.id)?.length ?? 0) > 0);
  }, [data, podsByClub]);

  return {
    data,
    loading,
    error,
    isHost,
    sliders,
    clubs,
    podsByClub,
    categoryChips,
    hostNameOf,
  };
}
