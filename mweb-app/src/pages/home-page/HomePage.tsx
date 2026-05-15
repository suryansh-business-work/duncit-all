import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Fab, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PriceFilter, DateFilter, SortBy } from './queries';
import FilterMenu from './FilterMenu';
import HomeSearch from './HomeSearch';
import HomeSkeleton from './HomeSkeleton';
import SliderRail from './SliderRail';
import ClubSection from './ClubSection';
import { useHomeData } from './useHomeData';

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const {
    data,
    loading,
    error,
    isHost,
    sliders,
    clubs,
    podsByClub,
    categoryChips,
    hostNameOf,
  } = useHomeData({
    superCategorySlug,
    locationId,
    zoneName,
    categoryId,
    priceFilter,
    dateFilter,
    sortBy,
  });

  if (categoryId && !categoryChips.some((c: any) => c.id === categoryId)) {
    setCategoryId('');
  }

  if (loading && !data) return <HomeSkeleton />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <>
      <SliderRail sliders={sliders} />
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" color="text.secondary">
            Browse pods
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterMenu
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              categoryChips={categoryChips}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              priceFilter={priceFilter}
              setPriceFilter={setPriceFilter}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              locationId={locationId}
            />
          </Stack>
        </Stack>
        <HomeSearch locationId={locationId} zoneName={zoneName} />

        {clubs.length === 0 ? (
          <Alert severity="info">
            No clubs in this category {locationId ? 'for the selected city' : ''} yet.
          </Alert>
        ) : (
          clubs.map((club: any) => (
            <ClubSection
              key={club.id}
              club={club}
              clubPods={podsByClub.get(club.id) ?? []}
              hostNameOf={hostNameOf}
            />
          ))
        )}
        {isHost && (
          <Fab
            color="primary"
            aria-label="Create pod"
            onClick={() => navigate('/host/manage')}
            sx={{
              position: 'fixed',
              bottom: 'calc(72px + env(safe-area-inset-bottom))',
              right: 16,
              zIndex: 5,
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </Stack>
    </>
  );
}
