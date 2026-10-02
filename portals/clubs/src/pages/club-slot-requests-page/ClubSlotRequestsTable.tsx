import { useMemo, type RefObject } from 'react';
import { Link as RouterLink } from 'react-router';
import { Chip, Link } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import type { ClubSlotRequestRow, ClubSlotRequestStatus } from './queries';

interface Props {
  fetchRows: TableFetch<ClubSlotRequestRow>;
  refetchRef: RefObject<(() => void) | null>;
  formatDateTime: (value: Date) => string;
  onResolve: (row: ClubSlotRequestRow) => void;
}

const STATUS_KEY: Readonly<Record<ClubSlotRequestStatus, string>> = {
  OPEN: 'directory.clubs.statusOpen',
  RESOLVED: 'directory.clubs.statusResolved',
};

const getRowId = (row: ClubSlotRequestRow) => row.id;

/** Every venue-slot request, newest first. Sort/filter keys are allowlisted on the server. */
export default function ClubSlotRequestsTable({
  fetchRows,
  refetchRef,
  formatDateTime,
  onResolve,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<ClubSlotRequestRow>[]>(() => {
    const renderClub = (row: ClubSlotRequestRow) => (
      <Link component={RouterLink} to={`/clubs/${row.club_id}`} underline="hover">
        {row.club_name}
      </Link>
    );
    const renderStatus = (row: ClubSlotRequestRow) => (
      <Chip
        size="small"
        variant={row.status === 'OPEN' ? 'filled' : 'outlined'}
        color={row.status === 'OPEN' ? 'warning' : 'default'}
        label={t(STATUS_KEY[row.status])}
      />
    );
    const renderActions = (row: ClubSlotRequestRow) =>
      row.status === 'OPEN' ? (
        <DuncitButton size="small" variant="outlined" onClick={() => onResolve(row)}>
          {t('directory.clubs.markResolved')}
        </DuncitButton>
      ) : null;

    return [
      {
        field: 'club_name',
        headerName: t('directory.clubs.colClub'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        cellRenderer: renderClub,
      },
      { field: 'host_name', headerName: t('directory.clubs.colHost'), minWidth: 160, type: 'text' },
      {
        field: 'host_contact',
        headerName: t('directory.clubs.colHostContact'),
        minWidth: 170,
        type: 'text',
        sortable: false,
        filterable: false,
      },
      {
        field: 'notified',
        headerName: t('directory.clubs.colNotified'),
        width: 150,
        type: 'number',
        filterable: false,
      },
      {
        field: 'status',
        headerName: t('directory.clubs.colStatus'),
        width: 130,
        type: 'enum',
        options: (Object.keys(STATUS_KEY) as ClubSlotRequestStatus[]).map((value) => ({
          value,
          label: t(STATUS_KEY[value]),
        })),
        cellRenderer: renderStatus,
        valueGetter: (row) => t(STATUS_KEY[row.status]),
      },
      dateColumn<ClubSlotRequestRow>({
        field: 'created_at',
        headerName: t('directory.clubs.colRequested'),
        hide: false,
        minWidth: 180,
        formatDate: formatDateTime,
      }),
      {
        field: 'actions',
        headerName: t('directory.clubs.colActions'),
        type: 'actions',
        width: 160,
        cellRenderer: renderActions,
      },
    ];
  }, [formatDateTime, onResolve, t]);

  return (
    <DuncitTable<ClubSlotRequestRow>
      tableId="clubs-slot-requests"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('directory.clubs.slotRequestsEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('directory.clubs.slotRequestsSearch')}
      refetchRef={refetchRef}
    />
  );
}
