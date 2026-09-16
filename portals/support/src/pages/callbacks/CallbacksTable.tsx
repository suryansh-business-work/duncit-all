import { useMemo, type MutableRefObject } from 'react';
import { Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { CallbackRequest } from '../../graphql/bouncer';
import { relativeTime } from '../../lib/supportTable';
import { CALLBACK_STATUS_COLORS } from '../../lib/statusMaps';
import { useTranslation } from '@duncit/shell';

// "Resolved" is the user-facing label for the backend CLOSED status.
type Translate = ReturnType<typeof useTranslation>['t'];

const statusOptions = (t: Translate): ReadonlyArray<{ value: CallbackRequest['status']; label: string }> => [
  { value: 'PENDING', label: t('support.callbacks.statusPending') },
  { value: 'CONTACTED', label: t('support.callbacks.statusContacted') },
  { value: 'CLOSED', label: t('support.callbacks.statusResolved') },
];

const getCallbackRowId = (req: CallbackRequest) => req.id;

const renderTicketNo = (req: CallbackRequest) => (
  <Typography variant="body2" component="span" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
    {req.ticket_no}
  </Typography>
);

const renderUser = (req: CallbackRequest) => (
  <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
    {req.user.name}
  </Typography>
);

const renderStatus = (req: CallbackRequest) => (
  <StatusChip status={req.status} colorMap={CALLBACK_STATUS_COLORS} />
);

// Sort and filter keys are allowlisted on the server (BOUNCER_SORTABLE /
// BOUNCER_FILTERABLE); column filters travel in the query's `filters` arg.
const buildColumns = (t: Translate): DuncitColumn<CallbackRequest>[] => [
  {
    field: 'ticket_no',
    headerName: t('support.callbacks.colId'),
    type: 'text',
    width: 140,
    cellRenderer: renderTicketNo,
    valueGetter: (req) => req.ticket_no,
  },
  {
    field: 'user',
    headerName: t('support.callbacks.colUser'),
    type: 'text',
    // The request stores only the user's id; the name is looked up per row.
    sortable: false,
    filterable: false,
    minWidth: 140,
    cellRenderer: renderUser,
    valueGetter: (req) => req.user.name,
  },
  {
    field: 'contact_phone',
    headerName: t('shell.common.phone'),
    type: 'text',
    minWidth: 150,
    valueGetter: (req) => req.contact_phone || '—',
  },
  {
    field: 'reason',
    headerName: t('support.callbacks.colDescription'),
    type: 'text',
    // Not in the server's sort/filter allowlist; the toolbar search covers it.
    sortable: false,
    filterable: false,
    flex: 1,
    minWidth: 220,
    valueGetter: (req) => req.reason || '—',
  },
  {
    field: 'status',
    headerName: t('shell.common.status'),
    width: 150,
    type: 'enum',
    options: statusOptions(t),
    cellRenderer: renderStatus,
    valueGetter: (req) => req.status,
  },
  {
    field: 'created_at',
    headerName: t('support.callbacks.colRequested'),
    type: 'date',
    minWidth: 160,
    valueGetter: (req) => relativeTime(req.created_at),
  },
];

interface Props {
  fetchRows: TableFetch<CallbackRequest>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (req: CallbackRequest) => void;
}

export default function CallbacksTable({ fetchRows, refetchRef, onRowClick }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(() => buildColumns(t), [t]);
  return (
    <DuncitTable<CallbackRequest>
      ariaLabel={t('support.callbacks.title')}
      tableId="support-callbacks"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getCallbackRowId}
      onRowClick={onRowClick}
      emptyText={t('support.callbacks.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search reason or phone"
      refetchRef={refetchRef}
    />
  );
}
