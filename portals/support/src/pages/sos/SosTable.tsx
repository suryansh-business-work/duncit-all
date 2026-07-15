import type { MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { SosAlert } from '../../graphql/bouncer';
import { relativeTime } from '../../lib/supportTable';

const STATUS_COLOR: Record<SosAlert['status'], 'error' | 'warning' | 'success'> = {
  ACTIVE: 'error',
  ACKNOWLEDGED: 'warning',
  RESOLVED: 'success',
};

const STATUS_OPTIONS: ReadonlyArray<{ value: SosAlert['status']; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const getSosRowId = (a: SosAlert) => a.id;

const renderTicketNo = (a: SosAlert) => (
  <Typography variant="body2" component="span" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
    {a.ticket_no}
  </Typography>
);

const renderUser = (a: SosAlert) => (
  <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
    {a.user.name}
  </Typography>
);

const renderStatus = (a: SosAlert) => (
  <Chip size="small" color={STATUS_COLOR[a.status]} label={a.status} />
);

const podValue = (a: SosAlert) =>
  a.pod.venue_name ? `${a.pod.title} · ${a.pod.venue_name}` : a.pod.title;

// Only fields the server whitelists (BOUNCER_SORTABLE) are sortable; the status
// filter maps onto the bouncerSosAlerts query's `status` arg.
const COLUMNS: DuncitColumn<SosAlert>[] = [
  {
    field: 'ticket_no',
    headerName: 'ID',
    width: 140,
    cellRenderer: renderTicketNo,
    valueGetter: (a) => a.ticket_no,
  },
  {
    field: 'user',
    headerName: 'User',
    sortable: false,
    minWidth: 140,
    cellRenderer: renderUser,
    valueGetter: (a) => a.user.name,
  },
  { field: 'pod', headerName: 'Pod', sortable: false, flex: 1, minWidth: 180, valueGetter: podValue },
  {
    field: 'contact_phone',
    headerName: 'Phone',
    minWidth: 150,
    valueGetter: (a) => a.contact_phone || '—',
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 150,
    filter: { type: 'select', options: STATUS_OPTIONS },
    cellRenderer: renderStatus,
    valueGetter: (a) => a.status,
  },
  {
    field: 'created_at',
    headerName: 'Raised',
    minWidth: 160,
    valueGetter: (a) => relativeTime(a.created_at),
  },
];

interface Props {
  fetchRows: TableFetch<SosAlert>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (a: SosAlert) => void;
}

export default function SosTable({ fetchRows, refetchRef, onRowClick }: Readonly<Props>) {
  return (
    <DuncitTable<SosAlert>
      tableId="support-sos"
      columns={COLUMNS}
      fetchRows={fetchRows}
      getRowId={getSosRowId}
      onRowClick={onRowClick}
      emptyText="No SOS Alerts Found"
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search message or phone"
      refetchRef={refetchRef}
    />
  );
}
