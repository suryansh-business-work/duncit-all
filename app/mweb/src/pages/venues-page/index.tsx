import { useEffect, useMemo, useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import VenueExploreCard, { type ExploreVenue } from './VenueExploreCard';
import VenuesLocationBar from './VenuesLocationBar';
import SearchPillField from '../pod-list/SearchPillField';
import AdCard from '../../components/ads/AdCard';
import EmptyState from '../../components/EmptyState';
import { interleaveAds, isAdEntry } from '../../components/ads/AdSlot';
import { useActiveAds } from '../../components/ads/useActiveAds';
import { useTranslation } from '../../i18n/useTranslation';

export const VENUES_EXPLORE = gql`
  query VenuesExplore($location_id: ID, $search: String, $super_category_id: ID) {
    publicVenues(location_id: $location_id, search: $search, super_category_id: $super_category_id) {
      id
      venue_name
      venue_type
      capacity
      cover_image_url
      gallery
      city
      locality
      pod_count
    }
  }
`;

/** Resolves the header tile's slug to the id `publicVenues` filters on. Same
 * root field the header already fetched, so cache-first answers it without a
 * second network call. */
const SUPER_CATEGORIES = gql`
  query VenuesSuperCategories {
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
  }
`;

/** Names the selected location so the bar can say which city these venues are
 * from. Same root field and fields the header already fetched, so cache-first
 * resolves it without a second network call. */
const VENUES_LOCATIONS = gql`
  query VenuesLocationNames {
    locations {
      id
      location_name
    }
  }
`;

const SEARCH_DEBOUNCE_MS = 400;

interface Props {
  locationId: string;
  superCategorySlug?: string;
}

/** Venues discovery — venues in the selected location with a server-side
 * debounced search, filtered by the header's Super-category tiles, and a
 * location bar that opens the header's picker to change city. Native twin:
 * VenuesScreen. */
export default function VenuesPage({ locationId, superCategorySlug }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce typing → one server search per pause.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: catData } = useQuery<any>(SUPER_CATEGORIES, { fetchPolicy: 'cache-first' });
  const superCategoryId = useMemo(
    () =>
      superCategorySlug
        ? ((catData?.superCategories ?? []).find((c: any) => c.slug === superCategorySlug)?.id ??
          null)
        : null,
    [catData, superCategorySlug]
  );
  const { data, loading, error } = useQuery<any>(VENUES_EXPLORE, {
    variables: {
      location_id: locationId || null,
      search: search || null,
      super_category_id: superCategoryId,
    },
    fetchPolicy: 'cache-and-network',
  });
  const { ads } = useActiveAds('VENUE_LIST');
  const venues: ExploreVenue[] = data?.publicVenues ?? [];
  const { data: locData } = useQuery<any>(VENUES_LOCATIONS, { fetchPolicy: 'cache-first' });
  const cityLabel = (locData?.locations ?? []).find(
    (l: { id: string }) => l.id === locationId,
  )?.location_name;

  return (
    <Stack
      spacing={1.5}
      sx={{ maxWidth: 720, mx: 'auto', width: '100%', p: { xs: 1.5, sm: 2 }, pb: { xs: 10, sm: 8 } }}
    >
      {/* No page title: the coral Venues tab already names the page, as on the
          native Venues tab (rule 27). */}
      <VenuesLocationBar cityLabel={cityLabel} />
      <SearchPillField
        placeholder={t('mweb.venues.searchVenuesByNameTypeOr')}
        value={searchInput}
        onChange={setSearchInput}
        ariaLabel="Search venues"
      />
      {loading && !data && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
          <CircularProgress size={22} />
        </Box>
      )}
      {!loading && error && (
        <Typography variant="body2" color="error">
          Could not load venues — please try again.
        </Typography>
      )}
      {!loading && !error && venues.length === 0 && (
        <EmptyState
          icon={<StorefrontOutlinedIcon />}
          title="No venues found here yet — try another search or category."
        />
      )}
      {interleaveAds(venues, ads, 4).map((entry) =>
        isAdEntry(entry) ? (
          <AdCard key={entry.__ad.id} ad={entry.__ad} />
        ) : (
          <VenueExploreCard key={entry.id} venue={entry} onOpen={() => navigate(`/venue/${entry.id}`)} />
        ),
      )}
    </Stack>
  );
}
