import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Fab, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { PriceFilter, DateFilter, SortBy } from './queries';
import FilterMenu from './FilterMenu';
import HomeSearch from './HomeSearch';
import HomeSkeleton from './HomeSkeleton';
import HomeStatusRail from './HomeStatusRail';
import HomeFeaturedPods from './HomeFeaturedPods';
import HomeVibeChips from './HomeVibeChips';
import ClubSection from './ClubSection';
import PreviousPodsRail from './PreviousPodsRail';
import AdSlot from '../../components/ads/AdSlot';
import { useHomeData } from './useHomeData';

interface HomePageProps {
  superCategorySlug: string;
  locationId: string;
  zoneName: string;
}

export default function HomePage({ superCategorySlug, locationId, zoneName }: Readonly<HomePageProps>) {
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
    branding,
    me,
    isHost,
    clubs,
    featuredPods,
    podsByClub,
    categoryChips,
    vibeCategories,
    followedClubs,
    hostPods,
    followedPosts,
    myStories,
    followedUsers,
    totalPods,
    previousPods,
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

  // No clubs/pods in this city → nothing to filter or search.
  const noContent = (data?.pods?.length ?? 0) === 0 && (data?.clubs?.length ?? 0) === 0;
  const podsLabel = `${totalPods} ${totalPods === 1 ? 'pod' : 'pods'} nearby`;

  return (
    <Stack
      spacing={2.25}
      sx={{
        pt: 0.25,
        mx: { xs: -1.25, sm: -2 },
        px: { xs: 1.25, sm: 2 },
        pb: 'calc(var(--duncit-bottom-nav-height, 72px) + env(safe-area-inset-bottom) + 10px)',
        minHeight: '100%',
      }}
    >
      <HomeStatusRail
        me={me ? { ...me, my_stories: myStories } : me}
        branding={branding}
        followedClubs={followedClubs}
        hostPods={hostPods}
        followedPosts={followedPosts}
        followedUsers={followedUsers}
      />
      <HomeVibeChips
        categories={vibeCategories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        allIcon={branding?.home_all_vibe_icon_url}
        action={
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
            disabled={noContent}
          />
        }
      />
      <Stack spacing={1.75}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.25 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            onClick={() => navigate('/happening-nearby')}
            role="button"
            tabIndex={0}
            aria-label="Open Happening nearby"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') navigate('/happening-nearby');
            }}
            sx={{ minWidth: 0, cursor: 'pointer' }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                color: 'primary.contrastText',
                background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
                boxShadow: '0 8px 18px rgba(255,79,115,0.24)',
                flex: '0 0 auto',
              }}
            >
              <WhatshotIcon sx={{ fontSize: 17 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15 }} noWrap>
                Happening nearby
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {podsLabel}
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/happening-nearby')}
            sx={{ fontWeight: 800, flex: '0 0 auto' }}
          >
            See all
          </Button>
        </Stack>
        <HomeFeaturedPods pods={featuredPods} />
        <HomeSearch locationId={locationId} zoneName={zoneName} disabled={noContent} />

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
        <PreviousPodsRail pods={previousPods} hostNameOf={hostNameOf} />
        <AdSlot position="HOME_BOTTOM" variant="banner" />
        {isHost && (
          <Fab
            color="primary"
            aria-label="Create pod"
            onClick={() => navigate('/create-pod')}
            sx={{
              position: 'fixed',
              bottom: 'calc(var(--duncit-bottom-nav-overlay-offset, 88px) + 16px)',
              right: 16,
              zIndex: 5,
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </Stack>
    </Stack>
  );
}
