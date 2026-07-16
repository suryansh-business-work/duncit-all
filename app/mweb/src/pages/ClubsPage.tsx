import { useEffect, useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import ClubsGrid from './clubs-page/ClubsGrid';
import SearchFilterSheet from './search-page/SearchFilterSheet';
import { scopeCategoryButtons, useSearchCategories } from './search-page/useSearchDiscovery';
import { OPEN_LOCATION_PICKER_EVENT } from '../components/app-header/queries';

const ALL_CLUBS = gql`
  query AllClubs($locationId: ID, $locality: String) {
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
    locations {
      id
      location_name
    }
    clubs(filter: { is_active: true, location_id: $locationId, locality: $locality }) {
      id
      club_id
      club_name
      club_description
      category_id
      super_category_id
      club_feature_images_and_videos {
        url
        type
      }
    }
    pods(filter: { is_active: true }) {
      id
      club_id
    }
  }
`;

interface ClubsPageProps {
  superCategorySlug?: string;
  locationId?: string;
  zoneName?: string;
}

export default function ClubsPage({
  superCategorySlug,
  locationId,
  zoneName,
}: Readonly<ClubsPageProps>) {
  const { data, loading, error } = useQuery(ALL_CLUBS, {
    variables: { locationId: locationId || undefined, locality: zoneName || undefined },
    fetchPolicy: 'cache-and-network',
  });
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const { all, buttons, matchesCategory } = useSearchCategories();
  const selectedSuperId = useMemo(
    () =>
      superCategorySlug
        ? ((data?.superCategories ?? []).find((s: any) => s.slug === superCategorySlug)?.id ?? null)
        : null,
    [data, superCategorySlug],
  );
  // Category chips follow the header's selected super category.
  const categoryOptions = useMemo(
    () => scopeCategoryButtons(buttons, all, selectedSuperId),
    [buttons, all, selectedSuperId],
  );
  const selectedCategory = categoryOptions.find((c) => c.id === categoryId) ?? null;

  // Clear the chosen chip when the super category changes so a now-hidden chip
  // isn't left selected.
  useEffect(() => {
    setCategoryId('');
  }, [superCategorySlug]);
  const selectedLocationName = useMemo(
    () => (data?.locations ?? []).find((l: any) => l.id === locationId)?.location_name ?? '',
    [data, locationId],
  );
  const locationNoteLabel = zoneName
    ? `${selectedLocationName} · ${zoneName}`
    : selectedLocationName;

  const podCounts = useMemo(() => {
    const m = new Map<string, number>();
    (data?.pods ?? []).forEach((p: any) =>
      m.set(p.club_id, (m.get(p.club_id) ?? 0) + 1),
    );
    return m;
  }, [data]);

  const clubs = useMemo(() => {
    const list = (data?.clubs ?? []).slice();
    const term = q.trim().toLowerCase();
    return list
      .filter((c: any) => !selectedSuperId || c.super_category_id === selectedSuperId)
      .filter((c: any) => matchesCategory(c, categoryId))
      .filter(
        (c: any) =>
          !term ||
          c.club_name?.toLowerCase().includes(term) ||
          c.club_description?.toLowerCase().includes(term),
      )
      .sort((a: any, b: any) => a.club_name.localeCompare(b.club_name));
  }, [data, q, categoryId, selectedSuperId, matchesCategory]);

  if (loading && !data)
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

  // A location is applied but no club operates in that locality (vs. a search
  // that matched nothing) — drives the "No Clubs operating…" + Reset CTA.
  const locationHasNoClubs = Boolean(locationId) && (data?.clubs ?? []).length === 0;
  const clubsBody =
    clubs.length === 0 ? (
      <Alert severity="info">No clubs found.</Alert>
    ) : (
      <ClubsGrid
        clubs={clubs}
        podCounts={podCounts}
        onOpen={(club) => club.club_id && navigate(`/club/${club.club_id}`)}
      />
    );

  return (
    <Stack
      spacing={2}
      sx={{
        mx: { xs: -1.25, sm: -2 },
        px: { xs: 1.25, sm: 2 },
        py: 0.5,
        minHeight: '100%',
      }}
    >
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
          Clubs
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 700 }}>
          Find communities hosting pods near you
        </Typography>
      </Box>
      {locationId && selectedLocationName && (
        <Alert severity="info" sx={{ borderRadius: 3, py: 0.25, alignItems: 'center', fontWeight: 700 }}>
          Showing clubs in <b>{locationNoteLabel}</b>. Want clubs from another location?{' '}
          <Link
            component="button"
            type="button"
            underline="always"
            sx={{ fontWeight: 800, verticalAlign: 'baseline' }}
            onClick={() => globalThis.dispatchEvent(new CustomEvent(OPEN_LOCATION_PICKER_EVENT))}
          >
            Change your location here
          </Link>
        </Alert>
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          placeholder="Search clubs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper' } }}
        />
        <Button
          variant="outlined"
          startIcon={<TuneIcon />}
          onClick={() => setFilterOpen(true)}
          sx={{ flex: '0 0 auto', borderRadius: 999, fontWeight: 800, whiteSpace: 'nowrap' }}
        >
          Category
        </Button>
      </Stack>
      {selectedCategory && (
        <Box>
          <Chip
            label={selectedCategory.name}
            color="primary"
            onDelete={() => setCategoryId('')}
            sx={{ fontWeight: 800 }}
          />
        </Box>
      )}
      {locationHasNoClubs ? (
        <Stack alignItems="center" spacing={1.5} sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={800}>
            No Clubs operating at the selected location,
          </Typography>
          <Button
            variant="contained"
            onClick={() => globalThis.dispatchEvent(new CustomEvent(OPEN_LOCATION_PICKER_EVENT))}
            sx={{ borderRadius: 999, fontWeight: 800 }}
          >
            Reset Location
          </Button>
        </Stack>
      ) : (
        clubsBody
      )}
      <SearchFilterSheet
        open={filterOpen}
        categories={categoryOptions}
        categoryId={categoryId}
        onClose={() => setFilterOpen(false)}
        onSelect={setCategoryId}
      />
    </Stack>
  );
}
