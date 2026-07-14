import { useMemo, type MutableRefObject } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Card, Link, Stack, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { ClubAdminClubRow } from './queries';
import { formatCount, formatMoney, formatRating } from './format';

interface Props {
  fetchRows: TableFetch<ClubAdminClubRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  currencySymbol: string;
}

const getClubRowId = (club: ClubAdminClubRow) => club.club_id;

const renderClub = (club: ClubAdminClubRow) => (
  <Link component={RouterLink} to={`/club-admin/clubs/${club.club_id}`} underline="hover" fontWeight={800}>
    {club.club_name}
  </Link>
);

export default function ClubAdminClubsTable({ fetchRows, refetchRef, currencySymbol }: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<ClubAdminClubRow>[]>(
    () => [
      {
        field: 'club_name',
        headerName: 'Club',
        flex: 1,
        minWidth: 180,
        filter: { type: 'text' },
        cellRenderer: renderClub,
        valueGetter: (club) => club.club_name,
      },
      {
        field: 'total_pods',
        headerName: 'Total pods',
        hide: true,
        width: 110,
        filter: { type: 'number' },
        valueGetter: (club) => formatCount(club.total_pods),
      },
      {
        field: 'upcoming_pods',
        headerName: 'Upcoming',
        width: 115,
        filter: { type: 'number' },
        valueGetter: (club) => formatCount(club.upcoming_pods),
      },
      {
        field: 'completed_pods',
        headerName: 'Completed',
        width: 120,
        filter: { type: 'number' },
        valueGetter: (club) => formatCount(club.completed_pods),
      },
      {
        field: 'followers',
        headerName: 'Followers',
        width: 115,
        filter: { type: 'number' },
        valueGetter: (club) => formatCount(club.followers),
      },
      {
        field: 'rating',
        headerName: 'Rating',
        width: 100,
        filter: { type: 'number' },
        valueGetter: (club) => formatRating(club.rating),
      },
      {
        field: 'revenue',
        headerName: 'Revenue',
        width: 120,
        filter: { type: 'number' },
        valueGetter: (club) => formatMoney(club.revenue, currencySymbol),
      },
    ],
    [currencySymbol],
  );

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={900}>Per-club breakdown</Typography>
        <DuncitTable<ClubAdminClubRow>
          tableId="partners-app-club-admin-clubs"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getClubRowId}
          emptyText="No clubs are assigned to you yet."
          defaultSort={{ field: 'club_name', dir: 'asc' }}
          searchPlaceholder="Search club name or slug"
          refetchRef={refetchRef}
        />
      </Stack>
    </Card>
  );
}
