import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '../../i18n';
import { REGION_CLUB_ADMIN_CLUBS, type RegionClub } from '../queries';

interface Props {
  /** The Club Admin whose clubs these are. */
  clubAdminId: string;
  /** A club row drills one level further, into that club's pods. */
  onOpenClub: (club: RegionClub) => void;
}

const getRowId = (row: RegionClub) => row.id;
const ACTIVE_COLORS = { ON: 'success', OFF: 'default' } as const;

/** The clubs one of the region's Club Admins runs — the middle level of the
 * drill-down, and the only one that is not a pod list. */
export default function RegionClubsTable({ clubAdminId, onOpenClub }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<RegionClub>(
    client,
    REGION_CLUB_ADMIN_CLUBS,
    'regionClubAdminClubs',
    { extraVariables: { user_id: clubAdminId } },
    [clubAdminId],
  );

  const columns = useMemo<DuncitColumn<RegionClub>[]>(() => {
    const renderClub = (row: RegionClub) => (
      <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
        <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
          {row.club_name}
        </Typography>
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
          {row.club_id}
        </Typography>
      </Stack>
    );
    const renderActive = (row: RegionClub) => (
      <StatusChip
        status={row.is_active ? 'ON' : 'OFF'}
        colorMap={ACTIVE_COLORS}
        label={row.is_active ? t('partners.regional.clubLive') : t('partners.regional.clubOff')}
      />
    );
    return [
      {
        field: 'club_name',
        headerName: t('partners.regional.clubNameColumn'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderClub,
        valueGetter: (row) => row.club_name,
      },
      {
        field: 'city',
        headerName: t('partners.regional.cityColumn'),
        minWidth: 140,
        valueGetter: (row) => row.city,
      },
      {
        field: 'locality',
        headerName: t('partners.regional.localityColumn'),
        minWidth: 140,
        valueGetter: (row) => row.locality,
      },
      {
        field: 'pod_count',
        headerName: t('partners.regional.podCountColumn'),
        width: 100,
        filter: { type: 'number' },
        valueGetter: (row) => row.pod_count,
      },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        width: 120,
        sortable: false,
        cellRenderer: renderActive,
        valueGetter: (row) => (row.is_active ? 1 : 0),
      },
    ];
  }, [t]);

  return (
    <DuncitTable<RegionClub>
      tableId="regional-club-admin-clubs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('partners.regional.noClubsForAdmin')}
      defaultSort={{ field: 'club_name', dir: 'asc' }}
      defaultPageSize={10}
      searchPlaceholder={t('partners.regional.searchClubs')}
      onRowClick={onOpenClub}
    />
  );
}
