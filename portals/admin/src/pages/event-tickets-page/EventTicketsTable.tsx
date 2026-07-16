import { useMemo, type MutableRefObject } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { EventTicketRow } from './queries';

interface Props {
  fetchRows: TableFetch<EventTicketRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onDownload: (t: EventTicketRow) => void;
  onCheckIn: (t: EventTicketRow) => void;
}

const STATUS_COLOR: StatusColorMap = {
  VALID: 'warning',
  CHECKED_IN: 'success',
  CANCELLED: 'default',
};

const STATUS_OPTIONS = [
  { value: 'VALID', label: 'Valid' },
  { value: 'CHECKED_IN', label: 'Checked in' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const getTicketRowId = (t: EventTicketRow) => t.id;

const eventCaption = (t: EventTicketRow) =>
  t.pod_mode === 'VIRTUAL' ? 'Virtual' : t.venue_name || t.zone_name || 'Physical';

const renderCode = (t: EventTicketRow) => (
  <Typography fontWeight={800} variant="body2" component="span">
    {t.ticket_code}
  </Typography>
);

const renderEvent = (t: EventTicketRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" fontWeight={600} component="span" display="block">
      {t.pod_title}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span" display="block">
      {eventCaption(t)}
    </Typography>
  </Box>
);

const renderAttendee = (t: EventTicketRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" component="span" display="block">
      {t.user_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span" display="block">
      {t.user_email}
    </Typography>
  </Box>
);

const renderStatus = (t: EventTicketRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <StatusChip status={t.status} label={t.status.replace('_', ' ')} colorMap={STATUS_COLOR} />
    {t.checked_in_at && (
      <Typography variant="caption" color="text.secondary" component="span" display="block">
        {fmt(t.checked_in_at)}
      </Typography>
    )}
  </Box>
);

export default function EventTicketsTable({
  fetchRows,
  refetchRef,
  onDownload,
  onCheckIn,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<EventTicketRow>[]>(() => {
    const renderActions = (t: EventTicketRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title="Download ticket">
          <IconButton size="small" onClick={() => onDownload(t)} aria-label="Download ticket">
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t.status === 'CHECKED_IN' ? 'Checked in' : 'Check in'}>
          <span>
            <IconButton
              size="small"
              color="success"
              disabled={t.status !== 'VALID'}
              onClick={() => onCheckIn(t)}
              aria-label="Check in"
            >
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'ticket_code', headerName: 'Ticket', minWidth: 140, cellRenderer: renderCode, valueGetter: (t) => t.ticket_code },
      {
        field: 'pod_title',
        headerName: 'Event',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderEvent,
        valueGetter: (t) => t.pod_title,
      },
      {
        field: 'user_name',
        headerName: 'Attendee',
        flex: 1,
        minWidth: 180,
        cellRenderer: renderAttendee,
        valueGetter: (t) => t.user_name,
      },
      { field: 'pod_date_time', headerName: 'When', minWidth: 170, valueGetter: (t) => fmt(t.pod_date_time) },
      {
        field: 'status',
        headerName: 'Status',
        filter: { type: 'select', options: STATUS_OPTIONS },
        minWidth: 140,
        cellRenderer: renderStatus,
        valueGetter: (t) => t.status.replace('_', ' '),
      },
      {
        field: 'checked_in_at',
        headerName: 'Checked in',
        filter: { type: 'date' },
        hide: true,
        minWidth: 170,
        valueGetter: (t) => fmt(t.checked_in_at),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        minWidth: 170,
        valueGetter: (t) => fmt(t.created_at),
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onDownload, onCheckIn]);

  return (
    <DuncitTable<EventTicketRow>
      tableId="admin-event-tickets"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getTicketRowId}
      emptyText="No tickets yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search code, attendee or event"
      refetchRef={refetchRef}
    />
  );
}
