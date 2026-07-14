import type { MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { CallbackRequest } from '../../graphql/bouncer';
import { relativeTime } from '../../lib/supportTable';

const STATUS_COLOR: Record<CallbackRequest['status'], 'warning' | 'primary' | 'default'> = {
  PENDING: 'warning',
  CONTACTED: 'primary',
  CLOSED: 'default',
};

// "Resolved" is the user-facing label for the backend CLOSED status.
const STATUS_OPTIONS: ReadonlyArray<{ value: CallbackRequest['status']; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'CLOSED', label: 'Resolved' },
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
  <Chip size="small" color={STATUS_COLOR[req.status]} label={req.status} />
);

// Only fields the server whitelists (BOUNCER_SORTABLE) are sortable; the status
// filter maps onto the bouncerCallbackRequests query's `status` arg.
const COLUMNS: DuncitColumn<CallbackRequest>[] = [
  {
    field: 'ticket_no',
    headerName: 'ID',
    sortable: false,
    width: 140,
    cellRenderer: renderTicketNo,
    valueGetter: (req) => req.ticket_no,
  },
  {
    field: 'user',
    headerName: 'User',
    sortable: false,
    minWidth: 140,
    cellRenderer: renderUser,
    valueGetter: (req) => req.user.name,
  },
  {
    field: 'contact_phone',
    headerName: 'Phone',
    sortable: false,
    minWidth: 150,
    valueGetter: (req) => req.contact_phone || '—',
  },
  {
    field: 'pod',
    headerName: 'Pod',
    sortable: false,
    flex: 1,
    minWidth: 180,
    valueGetter: (req) => req.pod?.title ?? '—',
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 150,
    filter: { type: 'select', options: STATUS_OPTIONS },
    cellRenderer: renderStatus,
    valueGetter: (req) => req.status,
  },
  {
    field: 'created_at',
    headerName: 'Requested',
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
  return (
    <DuncitTable<CallbackRequest>
      tableId="support-callbacks"
      columns={COLUMNS}
      fetchRows={fetchRows}
      getRowId={getCallbackRowId}
      onRowClick={onRowClick}
      emptyText="No Callback Requests Found"
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search reason or phone"
      refetchRef={refetchRef}
    />
  );
}
