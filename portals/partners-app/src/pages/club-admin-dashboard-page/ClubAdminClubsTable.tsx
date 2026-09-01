import { useMemo, type MutableRefObject } from 'react';
import { Link as RouterLink } from 'react-router';
import { Card, Link, Stack, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { ClubAdminClubRow } from './queries';
import { formatCount, formatMoney, formatRating } from './format';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<ClubAdminClubRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  currencySymbol: string;
}

const getClubRowId = (club: ClubAdminClubRow) => club.club_id;

const renderClub = (club: ClubAdminClubRow) => (
  <Link component={RouterLink} to={`/club-admin/clubs/${club.club_id}`} underline="hover" sx={{
    fontWeight: 800
  }}>
    {club.club_name}
  </Link>
);

export default function ClubAdminClubsTable({ fetchRows, refetchRef, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<ClubAdminClubRow>[]>(
    () => [
      {
        field: 'club_name',
        headerName: t('partners.common.club'),
        flex: 1,
        minWidth: 180,
        filter: { type: 'text' },
        cellRenderer: renderClub,
        valueGetter: (club) => club.club_name,
      },
      {
        field: 'total_pods',
        headerName: t('partners.clubAdminDashboardPage.totalPods'),
        hide: true,
        width: 110,
        filter: { type: 'number' },
        valueGetter: (club) => formatCount(club.total_pods),
      },
      {
        field: 'upcoming_pods',
        headerName: t('partners.common.upcoming'),
        width: 115,
        filter: { type: 'number' },
        valueGetter: (club) => formatCount(club.upcoming_pods),
      },
      {
        field: 'completed_pods',
        headerName: t('partners.common.completed'),
        width: 120,
        filter: { type: 'number' },
        valueGetter: (club) => formatCount(club.completed_pods),
      },
      {
        field: 'followers',
        headerName: t('partners.common.followers'),
        width: 115,
        filter: { type: 'number' },
        valueGetter: (club) => formatCount(club.followers),
      },
      {
        field: 'rating',
        headerName: t('partners.clubAdminDashboardPage.rating'),
        width: 100,
        filter: { type: 'number' },
        valueGetter: (club) => formatRating(club.rating),
      },
      {
        field: 'revenue',
        headerName: t('partners.clubAdminDashboardPage.revenue'),
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
        <Typography variant="subtitle2" sx={{
          fontWeight: 900
        }}>{t('partners.clubAdminDashboardPage.perClubBreakdown')}</Typography>
        <DuncitTable<ClubAdminClubRow>
          tableId="partners-app-club-admin-clubs"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getClubRowId}
          emptyText={t('partners.common.noClubsAreAssignedToYou')}
          defaultSort={{ field: 'club_name', dir: 'asc' }}
          searchPlaceholder="Search club name or slug"
          refetchRef={refetchRef}
        />
      </Stack>
    </Card>
  );
}
