import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import ExplorePodCard from './ExplorePodCard';
import ExploreHeader from './ExploreHeader';
import ExploreFilterSheet from './ExploreFilterSheet';
import { EXPLORE_PODS, TOGGLE_SAVED_POD } from './queries';
import { activeExploreFilterCount, filterExplorePods, type ExploreFilters } from './exploreFilters';

interface ExplorePageProps {
  superCategorySlug?: string;
  locationId?: string;
  zoneName?: string;
}

const DEFAULT_FILTERS: ExploreFilters = {
  preset: 'ALL',
  categoryId: '',
  price: 'ALL',
  date: 'ALL',
  search: '',
};

export default function ExplorePage({ superCategorySlug, locationId, zoneName }: ExplorePageProps) {
  const { data, loading, error } = useQuery(EXPLORE_PODS, {
    fetchPolicy: 'cache-and-network',
  });
  const [toggleSavedPod] = useMutation(TOGGLE_SAVED_POD);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [pendingSave, setPendingSave] = useState<Set<string>>(new Set());
  // Local optimistic overlay; merged with server saved_pod_ids.
  const [localSaved, setLocalSaved] = useState<Map<string, boolean>>(new Map());

  const serverSaved = useMemo<Set<string>>(
    () => new Set<string>(data?.me?.saved_pod_ids ?? []),
    [data?.me?.saved_pod_ids],
  );

  useEffect(() => {
    if (localSaved.size === 0) return;
    setLocalSaved((prev) => {
      const next = new Map(prev);
      for (const [id, want] of prev) {
        if (pendingSave.has(id)) continue;
        if (serverSaved.has(id) === want) next.delete(id);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSaved, pendingSave]);

  const isSaved = (id: string) =>
    localSaved.has(id) ? !!localSaved.get(id) : serverSaved.has(id);

  const clubsById = useMemo(() => {
    const m = new Map<string, any>();
    (data?.clubs ?? []).forEach((c: any) => m.set(c.id, c));
    return m;
  }, [data]);
  const locById = useMemo(() => {
    const m = new Map<string, any>();
    (data?.locations ?? []).forEach((l: any) => m.set(l.id, l));
    return m;
  }, [data]);
  const categoryChips = useMemo(() => {
    const categories = data?.categories ?? [];
    const supers = data?.superCategories ?? [];
    const selectedSuperId = superCategorySlug
      ? supers.find((category: any) => category.slug === superCategorySlug)?.id
      : null;
    if (!selectedSuperId) return categories.filter((category: any) => category.level !== 'SUPER');
    const parentById = new Map<string, string | null>(
      categories.map((category: any) => [category.id, category.parent_id ?? null])
    );
    const isDescendant = (id: string) => {
      let current: string | null | undefined = id;
      let guard = 0;
      while (current && guard++ < 16) {
        if (current === selectedSuperId) return true;
        current = parentById.get(current) ?? null;
      }
      return false;
    };
    return categories.filter((category: any) => category.level !== 'SUPER' && isDescendant(category.id));
  }, [data, superCategorySlug]);

  const pods = useMemo(() => {
    return filterExplorePods({
      pods: data?.pods ?? [],
      clubsById,
      categories: data?.categories ?? [],
      superCategories: data?.superCategories ?? [],
      superCategorySlug,
      locationId,
      zoneName,
      filters,
    });
  }, [data, clubsById, superCategorySlug, locationId, zoneName, filters]);

  const activeCount = activeExploreFilterCount(filters);

  const toggleSave = async (id: string) => {
    const want = !isSaved(id);
    setLocalSaved((prev) => new Map(prev).set(id, want));
    setPendingSave((prev) => new Set(prev).add(id));
    try {
      await toggleSavedPod({ variables: { pod_doc_id: id } });
    } catch {
      setLocalSaved((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    } finally {
      setPendingSave((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const exploreHeight = 'calc(100dvh - 64px - 56px - env(safe-area-inset-bottom))';

  return (
    <Box
      sx={{
        height: exploreHeight,
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'none',
        '& .slick-slider': { height: '100%' },
        '& .slick-list': { height: '100% !important' },
        '& .slick-track': { height: '100% !important' },
        '& .slick-slide': { height: '100% !important' },
        '& .slick-slide > div': { height: '100%' },
      }}
    >
      <ExploreHeader filters={filters} setFilters={setFilters} activeCount={activeCount} resultCount={pods.length} onOpenFilters={() => setFiltersOpen(true)} />
      {pods.length === 0 ? (
        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', px: 3 }}>
          <Alert severity="info">No pods match these filters.</Alert>
        </Stack>
      ) : (
        <Slider
          vertical
          verticalSwiping
          slidesToShow={1}
          slidesToScroll={1}
          arrows={false}
          infinite={false}
          speed={450}
          swipeToSlide
          touchThreshold={12}
          adaptiveHeight={false}
        >
          {pods.map((p: any) => (
            <Box key={p.id} sx={{ height: '100%' }}>
              <ExplorePodCard
                pod={p}
                club={clubsById.get(p.club_id)}
                location={locById.get(p.location_id)}
                saved={isSaved(p.id)}
                onToggleSave={() => toggleSave(p.id)}
                viewerId={data?.me?.user_id ?? null}
              />
            </Box>
          ))}
        </Slider>
      )}
      <ExploreFilterSheet
        open={filtersOpen}
        filters={filters}
        setFilters={setFilters}
        categories={categoryChips}
        activeCount={activeCount}
        resultCount={pods.length}
        onClose={() => setFiltersOpen(false)}
      />
    </Box>
  );
}
