import type { MutableRefObject, ReactNode } from 'react';
import { Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { DuncitTable, type DuncitColumn, type TableFetch, type TableFilterValue } from '@duncit/table';
import type { Ticket, TicketSource, TicketStatus } from '../../../graphql/tickets';
import { relativeTime } from '../../../lib/supportTable';
import { TICKET_PRIORITY_COLORS, TICKET_SOURCE_COLORS, TICKET_STATUS_COLORS } from '../../../lib/statusMaps';

const SOURCE_OPTIONS: ReadonlyArray<{ value: TicketSource; label: string }> = [
  { value: 'APP', label: 'Duncit App' },
  { value: 'WEBSITE', label: "Duncit's Main Website" },
];

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

/** Where it came in from, in the words an agent would use rather than the
 * stored enum — the two places are different jobs, not different codes. */
const SOURCE_LABEL: Record<TicketSource, string> = {
  APP: 'Duncit App',
  WEBSITE: "Duncit's Main Website",
};

const renderSource = (t: Ticket) => (
  <StatusChip status={SOURCE_LABEL[t.source] ?? t.source} colorMap={TICKET_SOURCE_COLORS} />
);

const renderStatus = (t: Ticket) => <StatusChip status={t.status} colorMap={TICKET_STATUS_COLORS} />;

const renderPriority = (t: Ticket) => <StatusChip status={t.priority} colorMap={TICKET_PRIORITY_COLORS} />;

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
    field: 'source',
    headerName: 'Source',
    sortable: false,
    // Sized for the longest label ("Duncit's Main Website") inside a chip —
    // at 150 it clipped, which is worse than the plainer wording it replaced.
    width: 210,
    filter: { type: 'select', options: SOURCE_OPTIONS },
    cellRenderer: renderSource,
    valueGetter: (t) => SOURCE_LABEL[t.source] ?? t.source,
  },
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
    /* v8 ignore next -- hidden column: AG Grid only invokes this valueGetter if the user unhides "Created" */
    valueGetter: (t) => relativeTime(t.created_at),
  },
];

interface Props {
  fetchRows: TableFetch<Ticket>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  externalFilters?: ReadonlyArray<TableFilterValue>;
  onRowClick: (t: Ticket) => void;
}

export default function TicketsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  externalFilters,
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
      externalFilters={externalFilters}
      emptyText="No tickets here yet."
      defaultSort={{ field: 'last_message_at', dir: 'desc' }}
      searchPlaceholder="Search subject"
      refetchRef={refetchRef}
    />
  );
}
