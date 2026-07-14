import type { MutableRefObject, ReactNode } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { Ticket, TicketPriority, TicketStatus } from '../../../graphql/tickets';
import { relativeTime } from '../../../lib/supportTable';

const STATUS_COLOR: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'default'> = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const PRIORITY_COLOR: Record<TicketPriority, 'error' | 'warning' | 'default'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'default',
};

const STATUS_OPTIONS: ReadonlyArray<{ value: TicketStatus; label: string }> = [
  { value: 'OPEN', label: 'OPEN' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'RESOLVED', label: 'RESOLVED' },
  { value: 'CLOSED', label: 'CLOSED' },
];

const getTicketRowId = (t: Ticket) => t.id;

const renderTicketNo = (t: Ticket) => (
  <Typography
    variant="body2"
    component="span"
    sx={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}
  >
    {t.ticket_no}
  </Typography>
);

const renderSubject = (t: Ticket) => (
  <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
    {t.subject}
  </Typography>
);

const renderStatus = (t: Ticket) => (
  <Chip size="small" color={STATUS_COLOR[t.status]} label={t.status} />
);

const renderPriority = (t: Ticket) => (
  <Chip size="small" color={PRIORITY_COLOR[t.priority]} label={t.priority} />
);

// Only fields the server whitelists (TICKET_SORTABLE) are sortable; the status
// filter maps onto the tickets query's `status` arg.
const COLUMNS: DuncitColumn<Ticket>[] = [
  {
    field: 'ticket_no',
    headerName: 'Ticket ID',
    sortable: false,
    width: 140,
    cellRenderer: renderTicketNo,
    valueGetter: (t) => t.ticket_no,
  },
  {
    field: 'subject',
    headerName: 'Subject',
    flex: 1,
    minWidth: 200,
    cellRenderer: renderSubject,
    valueGetter: (t) => t.subject,
  },
  { field: 'user', headerName: 'User', sortable: false, minWidth: 140, valueGetter: (t) => t.user.name },
  { field: 'category', headerName: 'Category', sortable: false, width: 130 },
  {
    field: 'status',
    headerName: 'Status',
    width: 130,
    filter: { type: 'select', options: STATUS_OPTIONS },
    cellRenderer: renderStatus,
    valueGetter: (t) => t.status,
  },
  {
    field: 'priority',
    headerName: 'Priority',
    width: 120,
    cellRenderer: renderPriority,
    valueGetter: (t) => t.priority,
  },
  {
    field: 'last_message_at',
    headerName: 'Last activity',
    minWidth: 160,
    valueGetter: (t) => relativeTime(t.last_message_at),
  },
  {
    field: 'created_at',
    headerName: 'Created',
    hide: true,
    minWidth: 160,
    valueGetter: (t) => relativeTime(t.created_at),
  },
];

interface Props {
  fetchRows: TableFetch<Ticket>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onRowClick: (t: Ticket) => void;
}

export default function TicketsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onRowClick,
}: Readonly<Props>) {
  return (
    <DuncitTable<Ticket>
      tableId="support-tickets"
      columns={COLUMNS}
      fetchRows={fetchRows}
      getRowId={getTicketRowId}
      onRowClick={onRowClick}
      toolbarActions={toolbarActions}
      emptyText="No tickets here yet."
      defaultSort={{ field: 'last_message_at', dir: 'desc' }}
      searchPlaceholder="Search subject"
      refetchRef={refetchRef}
    />
  );
}
