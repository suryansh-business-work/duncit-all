import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { STATUS_COLOR, statusOptions, surfaceOptions } from './status';
import type { AccountDeletionRow } from './queries';

const getRowId = (row: AccountDeletionRow) => row.id;

type Translate = ReturnType<typeof useTranslation>['t'];

// Cells live at module scope so a re-render does not hand the table a brand-new
// component type per column (S6478). The ones that read copy take `t` through a
// factory, which keeps the column definition a plain reference.
const renderReference = (row: AccountDeletionRow) => (
  <Typography variant="body2" fontFamily="monospace" noWrap>
    {row.request_id}
  </Typography>
);

const renderMember = (row: AccountDeletionRow) => (
  <Typography variant="body2" noWrap title={row.email}>
    {row.name || row.email}
  </Typography>
);

const renderContact = (row: AccountDeletionRow) => (
  <Typography variant="body2" color="text.secondary" noWrap title={row.email}>
    {row.phone || row.email}
  </Typography>
);

const renderStatus = (row: AccountDeletionRow) => (
  <Chip size="small" color={STATUS_COLOR[row.status] ?? 'default'} label={row.status} />
);

const renderSurface = (row: AccountDeletionRow) => (
  <Chip size="small" variant="outlined" label={row.surface} />
);

const renderRequested = (row: AccountDeletionRow) => (
  <Typography variant="body2" color="text.secondary">
    {formatDateTime(row.requested_at)}
  </Typography>
);

const renderReason = (t: Translate) => (row: AccountDeletionRow) => (
  <Typography
    variant="body2"
    noWrap
    color={row.reason ? 'text.primary' : 'text.disabled'}
    title={row.reason}
  >
    {row.reason || t('tech.accountDeletions.noReason')}
  </Typography>
);

interface Props {
  fetchRows: TableFetch<AccountDeletionRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onOpen: (row: AccountDeletionRow) => void;
}

export default function AccountDeletionsTable({ fetchRows, refetchRef, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<AccountDeletionRow>[]>(
    () => [
      {
        field: 'request_id',
        headerName: t('tech.accountDeletions.reference'),
        width: 165,
        cellRenderer: renderReference,
      },
      {
        field: 'status',
        headerName: t('tech.accountDeletions.status'),
        width: 130,
        filter: { type: 'select', options: statusOptions() },
        cellRenderer: renderStatus,
      },
      {
        field: 'snapshot_name',
        headerName: t('tech.accountDeletions.member'),
        width: 180,
        cellRenderer: renderMember,
      },
      {
        field: 'snapshot_email',
        headerName: t('tech.accountDeletions.contact'),
        width: 190,
        cellRenderer: renderContact,
      },
      {
        field: 'surface',
        headerName: t('tech.accountDeletions.askedFrom'),
        width: 130,
        filter: { type: 'select', options: surfaceOptions() },
        cellRenderer: renderSurface,
      },
      {
        field: 'requested_at',
        headerName: t('tech.accountDeletions.requested'),
        width: 175,
        cellRenderer: renderRequested,
      },
      {
        field: 'reason',
        headerName: t('tech.accountDeletions.reason'),
        flex: 1,
        minWidth: 220,
        sortable: false,
        cellRenderer: renderReason(t),
      },
    ],
    [t]
  );

  return (
    <DuncitTable<AccountDeletionRow>
      tableId="tech-account-deletions"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.accountDeletions.empty')}
      defaultSort={{ field: 'requested_at', dir: 'asc' }}
      searchPlaceholder={t('tech.accountDeletions.searchHint')}
      refetchRef={refetchRef}
      onRowClick={onOpen}
    />
  );
}
