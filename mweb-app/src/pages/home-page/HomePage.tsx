import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import {
  Alert,
  Avatar,
  Box,
  Card,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { HOME_DATA, PriceFilter, DateFilter, SortBy } from './queries';
import SliderCard from './SliderCard';
import PodCard from './PodCard';
import FilterBar from './FilterBar';

interface HomePageProps {
  superCategorySlug: string;
  locationId: string;
  zoneName: string;
}

export default function HomePage({ superCategorySlug, locationId, zoneName }: HomePageProps) {
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState<string>('');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('DATE_ASC');

  const { data, loading, error } = useQuery(HOME_DATA, {
    variables: {
      locId: locationId || undefined,
      superCatSlug: superCategorySlug || undefined,
      podFilter: {
        location_id: locationId || undefined,
        zone_name: zoneName || undefined,
        is_active: true,
      },
    },
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

  const sliders = useMemo(() => {
    const a = data?.sliders ?? [];
    const b = data?.globalSliders ?? [];
    const map = new Map<string, any>();
    [...a, ...b].forEach((s) => map.set(s.id, s));
    return [...map.values()].sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0));
  }, [data]);

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

  useMemo(() => {
    if (categoryId && !categoryChips.some((c: any) => c.id === categoryId)) {
      setCategoryId('');
    }
  }, [categoryChips, categoryId]);

  const clubs = useMemo(() => {
    const all = data?.clubs ?? [];
    return all.filter((c: any) => (podsByClub.get(c.id)?.length ?? 0) > 0);
  }, [data, podsByClub]);

  if (loading && !data) {
    return (
      <Stack spacing={4}>
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
        {[0, 1].map((i) => (
          <Box key={i}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
              <Skeleton variant="rounded" width={44} height={44} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="40%" height={24} />
                <Skeleton width="60%" height={16} />
              </Box>
              <Skeleton variant="rounded" width={70} height={24} />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ overflow: 'hidden' }}>
              {[0, 1, 2].map((j) => (
                <Box key={j} sx={{ minWidth: 240 }}>
                  <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
                  <Skeleton width="80%" height={22} sx={{ mt: 1 }} />
                  <Skeleton width="50%" height={16} />
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack spacing={4}>
      {sliders.length > 0 && (
        <Box
          sx={{
            '.slick-dots': { bottom: 12 },
            '.slick-dots li button:before': { color: 'common.white', opacity: 0.6 },
            '.slick-dots li.slick-active button:before': { opacity: 1 },
            '.slick-prev, .slick-next': { zIndex: 1, width: 36, height: 36 },
            '.slick-prev': { left: 12 },
            '.slick-next': { right: 12 },
          }}
        >
          <Slider
            dots
            arrows={sliders.length > 1}
            infinite={sliders.length > 1}
            autoplay={sliders.length > 1}
            autoplaySpeed={5000}
            speed={500}
            slidesToShow={1}
            slidesToScroll={1}
            adaptiveHeight
          >
            {sliders.map((s) => (
              <Box key={s.id} sx={{ px: 0.5 }}>
                <SliderCard slider={s} />
              </Box>
            ))}
          </Slider>
        </Box>
      )}

      <FilterBar
        categoryChips={categoryChips}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        priceFilter={priceFilter}
        setPriceFilter={setPriceFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {clubs.length === 0 ? (
        <Alert severity="info">
          No clubs in this category {locationId ? 'for the selected city' : ''} yet.
        </Alert>
      ) : (
        clubs.map((club: any) => {
          const clubPods = podsByClub.get(club.id) ?? [];
          return (
            <Box key={club.id}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/clubs/${club.id}`)}
                >
                  <Avatar
                    src={club.club_feature_images_and_videos?.[0]?.url}
                    variant="rounded"
                    sx={{ width: 44, height: 44, bgcolor: 'primary.main' }}
                  >
                    <GroupsIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {club.club_name}
                    </Typography>
                    {club.club_description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {club.club_description}
                      </Typography>
                    )}
                  </Box>
                </Stack>
                <Chip size="small" label={`${clubPods.length} pods`} />
              </Stack>

              {clubPods.length === 0 ? (
                <Card variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No upcoming pods in this club for the selected city.
                  </Typography>
                </Card>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    overflowX: 'auto',
                    pb: 1.5,
                    scrollSnapType: 'x mandatory',
                    '&::-webkit-scrollbar': { height: 6 },
                    '&::-webkit-scrollbar-thumb': {
                      bgcolor: 'action.hover',
                      borderRadius: 3,
                    },
                  }}
                >
                  {clubPods.map((p) => (
                    <PodCard key={p.id} pod={p} onOpen={() => navigate(`/pods/${p.id}`)} />
                  ))}
                </Box>
              )}
            </Box>
          );
        })
      )}
    </Stack>
  );
}
