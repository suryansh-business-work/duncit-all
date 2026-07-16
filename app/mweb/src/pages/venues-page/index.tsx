import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VenueExploreCard, { type ExploreVenue } from './VenueExploreCard';
import AdCard from '../../components/ads/AdCard';
import { interleaveAds, isAdEntry } from '../../components/ads/AdSlot';
import { useActiveAds } from '../../components/ads/useActiveAds';

export const VENUES_EXPLORE = gql`
  query VenuesExplore($location_id: ID, $search: String, $super_category_id: ID) {
    publicVenues(location_id: $location_id, search: $search, super_category_id: $super_category_id) {
      id
      venue_name
      venue_type
      capacity
      cover_image_url
      city
      locality
      pod_count
    }
  }
`;

const SUPER_CATEGORIES = gql`
  query VenuesSuperCategories {
    categories(filter: { level: SUPER, parent_id: null }) {
      id
      name
      is_active
    }
  }
`;

const SEARCH_DEBOUNCE_MS = 400;

interface Props {
  locationId: string;
  cityLabel?: string;
}

/** Venues discovery — venues in the selected location with a server-side
 * debounced search + Super-category filter. Native twin: VenuesScreen. */
export default function VenuesPage({ locationId, cityLabel }: Readonly<Props>) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [superCategoryId, setSuperCategoryId] = useState('');

  // Debounce typing → one server search per pause.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: catData } = useQuery(SUPER_CATEGORIES, { fetchPolicy: 'cache-first' });
  const categories = (catData?.categories ?? []).filter(
    (c: { is_active?: boolean | null }) => c.is_active !== false,
  );
  const { data, loading, error } = useQuery(VENUES_EXPLORE, {
    variables: {
      location_id: locationId || null,
      search: search || null,
      super_category_id: superCategoryId || null,
    },
    fetchPolicy: 'cache-and-network',
  });
  const { ads } = useActiveAds('VENUE_LIST');
  const venues: ExploreVenue[] = data?.publicVenues ?? [];

  return (
    <Stack
      spacing={1.5}
      sx={{ maxWidth: 720, mx: 'auto', width: '100%', p: { xs: 1.5, sm: 2 }, pb: { xs: 10, sm: 8 } }}
    >
      <Typography variant="h5" sx={{ fontWeight: 950 }}>
        Venues
      </Typography>
      {cityLabel && (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <PlaceIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Venues in {cityLabel}
          </Typography>
        </Stack>
      )}
      <TextField
        size="small"
        placeholder="Search venues by name, type or area"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        inputProps={{ 'aria-label': 'Search venues' }}
        fullWidth
      />
      {categories.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {[{ id: '', name: 'All' }, ...categories].map((c: { id: string; name: string }) => (
            <Chip
              key={c.id || 'all'}
              label={c.name}
              onClick={() => setSuperCategoryId(c.id)}
              color={superCategoryId === c.id ? 'primary' : 'default'}
              variant={superCategoryId === c.id ? 'filled' : 'outlined'}
              size="small"
              sx={{ fontWeight: 700, flexShrink: 0 }}
            />
          ))}
        </Stack>
      )}
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
        <Typography variant="body2" color="text.secondary">
          No venues found here yet — try another search or category.
        </Typography>
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
