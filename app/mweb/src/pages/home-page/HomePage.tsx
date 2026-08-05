import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Fab, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PriceFilter, DateFilter, SortBy } from './queries';
import FilterMenu from './FilterMenu';
import HomeSearch from './HomeSearch';
import HomeSkeleton from './HomeSkeleton';
import HomeStatusRail from './HomeStatusRail';
import HomeFeaturedPods from './HomeFeaturedPods';
import HomeNearbyHeader from './HomeNearbyHeader';
import HomeVibeChips from './HomeVibeChips';
import HostCtaBanner from './HostCtaBanner';
import ClubRecommendationRow from './ClubRecommendationRow';
import ClubSection from './ClubSection';
import PreviousPodsRail from './PreviousPodsRail';
import AdSlot from '../../components/ads/AdSlot';
import { useSavedPodHearts } from '../../hooks/useSavedPodHearts';
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
    locations,
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
    followedUsers,
    totalPods,
    previousPods,
    hostNameOf,
    categoryLabelOf,
  } = useHomeData({
    superCategorySlug,
    locationId,
    zoneName,
    categoryId,
    priceFilter,
    dateFilter,
    sortBy,
  });

  const saved = useSavedPodHearts();

  if (categoryId && !categoryChips.some((c: any) => c.id === categoryId)) {
    setCategoryId('');
  }

  if (loading && !data) return <HomeSkeleton />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  // No clubs/pods in this city → nothing to filter or search.
  const noContent = (data?.pods?.length ?? 0) === 0 && (data?.clubs?.length ?? 0) === 0;
  // A chip/filter narrows the rails; the full-list pages are unfiltered, so
  // the See-all cards drop their count + jump-to-index while one is active.
  const railsFiltered = Boolean(categoryId) || priceFilter !== 'ALL' || dateFilter !== 'ALL';

  return (
    <Stack
      spacing={3}
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
        clubStories={clubStories}
        followedUsers={followedUsers}
      />
      <Box data-tour="home-categories">
      <HomeVibeChips
        categories={vibeCategories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        allIcon={branding?.home_all_vibe_icon_url}
        allLayout={branding?.home_all_vibe_icon_layout}
        heading={branding?.home_vibe_heading}
        subheading={branding?.home_vibe_subheading}
        action={
          <Box data-tour="home-filters" component="span">
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
          </Box>
        }
      />
      </Box>
      <Stack spacing={2.25}>
        <HomeNearbyHeader totalPods={totalPods} onOpen={() => navigate('/happening-nearby')} />
        <Box data-tour="home-pods">
          <HomeFeaturedPods
            pods={featuredPods}
            totalCount={totalPods}
            filtered={railsFiltered}
            categoryLabelOf={categoryLabelOf}
            savedOf={saved.signedIn ? saved.isSaved : undefined}
            savingOf={saved.signedIn ? saved.isSaving : undefined}
            onToggleSave={saved.signedIn ? saved.toggle : undefined}
          />
        </Box>
        <HostCtaBanner
          isHost={isHost}
          onCreatePod={() => navigate('/create-pod')}
          onBecomeHost={() => navigate('/earn')}
        />
        <ClubRecommendationRow clubs={clubs} locations={locations} />
        <Box data-tour="home-search">
          <HomeSearch locationId={locationId} zoneName={zoneName} disabled={noContent} />
        </Box>

        {clubs.length === 0 ? (
          <Alert severity="info">
            No clubs in this category {locationId ? 'for the selected city' : ''} yet.
          </Alert>
        ) : (
          <Box data-tour="home-clubs">
            {clubs.map((club: any) => (
              <ClubSection
                key={club.id}
                club={club}
                clubPods={podsByClub.get(club.id) ?? []}
                hostNameOf={hostNameOf}
                categoryLabelOf={categoryLabelOf}
                savedOf={saved.signedIn ? saved.isSaved : undefined}
                savingOf={saved.signedIn ? saved.isSaving : undefined}
                onToggleSave={saved.signedIn ? saved.toggle : undefined}
              />
            ))}
          </Box>
        )}
        <PreviousPodsRail pods={previousPods} hostNameOf={hostNameOf} filtered={railsFiltered} />
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
