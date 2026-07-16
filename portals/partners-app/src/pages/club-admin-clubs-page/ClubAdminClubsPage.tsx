import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, CircularProgress, Grid, Pagination, Stack, Typography } from '@mui/material';
import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import { useDebouncedValue } from '@duncit/ui';
import { MY_ADMIN_CLUBS_PAGE, type AdminClub } from './queries';
import ClubAdminClubsFilters from './ClubAdminClubsFilters';
import ClubAdminClubCard from './ClubAdminClubCard';

const PAGE_SIZE = 12;

export default function ClubAdminClubsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState<AdminCategoryValue>(EMPTY_CATEGORY);
  const [page, setPage] = useState(0);

  // Debounce the typed term into the server query.
  const search = useDebouncedValue(searchInput.trim(), 300);

  // Any filter change resets to the first page.
  useEffect(() => {
    setPage(0);
  }, [search, category.super_id, category.category_id, category.sub_id]);

  const filter = useMemo(
    () => ({
      search: search || undefined,
      super_category_id: category.super_id || undefined,
      category_id: category.category_id || undefined,
      sub_category_id: category.sub_id || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [search, category, page]
  );

  const { data, loading, error } = useQuery(MY_ADMIN_CLUBS_PAGE, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
  const clubs: AdminClub[] = data?.myAdminClubsPage?.items ?? [];
  const total: number = data?.myAdminClubsPage?.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const active = !!search || !!category.super_id;

  const clear = () => {
    setSearchInput('');
    setCategory(EMPTY_CATEGORY);
  };

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Stack spacing={0.25}>
        <Typography variant="h5" fontWeight={950}>Your Clubs</Typography>
        <Typography variant="body2" color="text.secondary">
          Clubs you administer. Open a club to manage its pods.
        </Typography>
      </Stack>

      <ClubAdminClubsFilters
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        category={category}
        onCategory={setCategory}
        onClear={clear}
        active={active}
      />

      {error && <Alert severity="error">{error.message}</Alert>}
      {loading && !data && (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={24} />
        </Stack>
      )}
      {!loading && total === 0 && (
        <Alert severity="info">
          {active ? 'No clubs match these filters.' : 'No clubs are assigned to you yet.'}
        </Alert>
      )}

      <Grid container spacing={2}>
        {clubs.map((club) => (
          <Grid item xs={12} sm={6} md={4} key={club.id}>
            <ClubAdminClubCard club={club} />
          </Grid>
        ))}
      </Grid>

      {pageCount > 1 && (
        <Stack alignItems="center" sx={{ pt: 1 }}>
          <Pagination
            count={pageCount}
            page={page + 1}
            onChange={(_, next) => setPage(next - 1)}
            color="primary"
          />
        </Stack>
      )}
    </Stack>
  );
}
