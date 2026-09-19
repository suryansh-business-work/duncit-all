import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { DuncitTable, type DuncitColumn, type TableFetch, type TableFilterValue } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import {
  TICKET_CATEGORIES,
  type Ticket,
  type TicketPriority,
  type TicketSource,
  type TicketStatus,
} from '../../../graphql/tickets';
import { relativeTime } from '../../../lib/supportTable';
import { TICKET_PRIORITY_COLORS, TICKET_SOURCE_COLORS, TICKET_STATUS_COLORS } from '../../../lib/statusMaps';



const STATUS_OPTIONS: ReadonlyArray<{ value: TicketStatus; label: string }> = [
  { value: 'OPEN', label: 'OPEN' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'RESOLVED', label: 'RESOLVED' },
  { value: 'CLOSED', label: 'CLOSED' },
];

/** The stored category, as the cell shows it. */
const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((value) => ({ value, label: value }));

const PRIORITY_KEY: Record<TicketPriority, string> = {
  HIGH: 'support.tickets.priorityHigh',
  MEDIUM: 'support.tickets.priorityMedium',
  LOW: 'support.tickets.priorityLow',
};

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
const SOURCE_KEY: Record<TicketSource, string> = {
  APP: 'support.tickets.sourceApp',
  WEBSITE: 'support.tickets.sourceWebsite',
  // Mail Automation opened it. The agent's reply has to reach an email thread,
  // not only an app the sender may not have — which is why it says so.
  EMAIL: 'support.tickets.sourceMailbox',
  // The pet store's Contact page (ecomm.duncit.com) — the ecomm team's queue.
  STORE: 'support.tickets.sourceStore',
};

const renderSource = (t: Ticket, translate: Translate) => (
  <StatusChip status={translate(SOURCE_KEY[t.source]) || t.source} colorMap={TICKET_SOURCE_COLORS} />
);

const renderStatus = (t: Ticket) => <StatusChip status={t.status} colorMap={TICKET_STATUS_COLORS} />;

const renderPriority = (t: Ticket) => <StatusChip status={t.priority} colorMap={TICKET_PRIORITY_COLORS} />;

// Sort and filter keys are allowlisted on the server (TICKET_SORTABLE /
// TICKET_FILTERABLE); column filters travel in the tickets query's `filters` arg.
type Translate = ReturnType<typeof useTranslation>['t'];

/** Headings and the Source wording are copy, so the columns are built from
 *  the active catalogue. The parameter is  because every row
 *  callback in this file already binds  to the Ticket. */
const buildColumns = (translate: Translate): DuncitColumn<Ticket>[] => [
  {
    field: 'ticket_no',
    headerName: translate('support.tickets.colId'),
    type: 'text',
    // Derived from the document id when the ticket is read — nothing stored to order or match on.
    sortable: false,
    filterable: false,
    width: 140,
    cellRenderer: renderTicketNo,
    valueGetter: (t) => t.ticket_no,
  },
  {
    field: 'subject',
    headerName: translate('support.tickets.colSubject'),
    type: 'text',
    flex: 1,
    minWidth: 200,
    cellRenderer: renderSubject,
    valueGetter: (t) => t.subject,
  },
  {
    field: 'user',
    headerName: translate('support.tickets.colUser'),
    type: 'text',
    // The ticket stores only the user's id; the name is looked up per row.
    sortable: false,
    filterable: false,
    minWidth: 140,
    valueGetter: (t) => t.user.name,
  },
  {
    field: 'category',
    headerName: translate('support.tickets.colCategory'),
    type: 'enum',
    options: CATEGORY_OPTIONS,
    width: 130,
  },
  {
    field: 'source',
    headerName: translate('support.tickets.colSource'),
    // Sized for the longest label ("Duncit's Main Website") inside a chip —
    // at 150 it clipped, which is worse than the plainer wording it replaced.
    width: 210,
    // Same map the chip and the cell read, so the filter cannot name a
    // source differently from the column.
    type: 'enum',
    options: Object.entries(SOURCE_KEY).map(([value, key]) => ({
      value: value as TicketSource,
      label: translate(key),
    })),
    cellRenderer: (row: Ticket) => renderSource(row, translate),
    valueGetter: (t) => translate(SOURCE_KEY[t.source]) || t.source,
  },
  {
    field: 'status',
    headerName: translate('shell.common.status'),
    width: 130,
    type: 'enum',
    options: STATUS_OPTIONS,
    cellRenderer: renderStatus,
    valueGetter: (t) => t.status,
  },
  {
    field: 'priority',
    headerName: translate('support.tickets.colPriority'),
    type: 'enum',
    options: Object.entries(PRIORITY_KEY).map(([value, key]) => ({ value, label: translate(key) })),
    width: 120,
    cellRenderer: renderPriority,
    valueGetter: (t) => t.priority,
  },
  {
    field: 'last_message_at',
    headerName: translate('support.tickets.colLastActivity'),
    type: 'date',
    minWidth: 160,
    valueGetter: (t) => relativeTime(t.last_message_at),
  },
  {
    field: 'created_at',
    headerName: translate('shell.common.created'),
    type: 'date',
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
  const { t } = useTranslation();
  const columns = useMemo(() => buildColumns(t), [t]);
  return (
    <DuncitTable<Ticket>
      ariaLabel={t('support.tickets.title')}
      tableId="support-tickets"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getTicketRowId}
      onRowClick={onRowClick}
      toolbarActions={toolbarActions}
      externalFilters={externalFilters}
      emptyText={t('support.tickets.empty')}
      defaultSort={{ field: 'last_message_at', dir: 'desc' }}
      searchPlaceholder="Search subject"
      refetchRef={refetchRef}
    />
  );
}
