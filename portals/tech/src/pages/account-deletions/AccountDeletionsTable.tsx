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
  <Typography variant="body2" noWrap sx={{
    fontFamily: "monospace"
  }}>
    {row.request_id}
  </Typography>
);

const renderMember = (row: AccountDeletionRow) => (
  <Typography variant="body2" noWrap title={row.email}>
    {row.name || row.email}
  </Typography>
);

const renderContact = (row: AccountDeletionRow) => (
  <Typography variant="body2" noWrap title={row.email} sx={{
    color: "text.secondary"
  }}>
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
  <Typography variant="body2" sx={{
    color: "text.secondary"
  }}>
    {formatDateTime(row.requested_at)}
  </Typography>
);

const renderScheduled = (row: AccountDeletionRow) => (
  <Typography variant="body2" sx={{
    color: "text.secondary"
  }}>
    {formatDateTime(row.scheduled_delete_at)}
  </Typography>
);

/** Urgency as a colour, so a queue that is running out is visible at a glance
 * rather than needing every date read. */
function remainingColor(days: number): 'error' | 'warning' | 'default' {
  if (days <= 0) return 'error';
  if (days <= 3) return 'warning';
  return 'default';
}

/**
 * How long is left on the promise.
 *
 * Only PENDING rows count down — a cancelled or completed request has no clock
 * left to run, and a countdown on one reads as still scheduled. The server
 * sends null in exactly that case, which is why this is a null check and not a
 * status check repeated on the client.
 */
const renderRemaining = (t: Translate) => (row: AccountDeletionRow) => {
  if (row.days_remaining === null) {
    return (
      <Typography variant="body2" sx={{
        color: "text.disabled"
      }}>
        —
      </Typography>
    );
  }
  const label =
    row.days_remaining === 0
      ? t('tech.accountDeletions.dueNow')
      : t('tech.accountDeletions.daysLeft', { vars: { count: row.days_remaining } });
  return <Chip size="small" color={remainingColor(row.days_remaining)} label={label} />;
};

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
        field: 'scheduled_delete_at',
        headerName: t('tech.accountDeletions.scheduled'),
        width: 175,
        cellRenderer: renderScheduled,
      },
      {
        // Not sortable on itself: the countdown is derived, and sorting by the
        // date it counts down from is the same order.
        field: 'days_remaining',
        headerName: t('tech.accountDeletions.timeLeft'),
        width: 125,
        sortable: false,
        cellRenderer: renderRemaining(t),
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
