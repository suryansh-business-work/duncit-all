import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import ClubListCard from './clubs-page/ClubListCard';
import SearchFilterSheet from './search-page/SearchFilterSheet';
import { useSearchCategories } from './search-page/useSearchDiscovery';

const ALL_CLUBS = gql`
  query AllClubs {
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
    clubs(filter: { is_active: true }) {
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
}

export default function ClubsPage({ superCategorySlug }: Readonly<ClubsPageProps>) {
  const { data, loading, error } = useQuery(ALL_CLUBS, {
    fetchPolicy: 'cache-and-network',
  });
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const { buttons: categoryOptions } = useSearchCategories();
  const selectedCategory = categoryOptions.find((c) => c.id === categoryId) ?? null;

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
    const supers = data?.superCategories ?? [];
    const selectedSuperId = superCategorySlug
      ? supers.find((s: any) => s.slug === superCategorySlug)?.id
      : null;
    return list
      .filter((c: any) => !selectedSuperId || c.super_category_id === selectedSuperId)
      .filter(
        (c: any) =>
          !categoryId || c.category_id === categoryId || c.super_category_id === categoryId,
      )
      .filter(
        (c: any) =>
          !term ||
          c.club_name?.toLowerCase().includes(term) ||
          c.club_description?.toLowerCase().includes(term),
      )
      .sort((a: any, b: any) => a.club_name.localeCompare(b.club_name));
  }, [data, q, categoryId, superCategorySlug]);

  if (loading && !data)
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

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
      {clubs.length === 0 ? (
        <Alert severity="info">No clubs found.</Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {clubs.map((club: any) => (
            <ClubListCard
              key={club.id}
              club={club}
              podCount={podCounts.get(club.id) ?? 0}
              onOpen={() => club.club_id && navigate(`/club/${club.club_id}`)}
            />
          ))}
        </Box>
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
