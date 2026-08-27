import { useMemo, type MutableRefObject } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DuncitIconButton } from '@duncit/buttons';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { EventTicketRow } from './queries';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

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

type Translate = ReturnType<typeof useTranslation>['t'];

const statusOptions = (t: Translate) => [
  { value: 'VALID', label: t('admin.eventTickets.valid') },
  { value: 'CHECKED_IN', label: t('admin.eventTickets.checkedIn') },
  { value: 'CANCELLED', label: t('admin.eventTickets.cancelled') },
];

const fmt = (iso?: string | null) =>
  iso ? formatDateTime(iso) : '—';

const getTicketRowId = (t: EventTicketRow) => t.id;

const eventCaption = (t: EventTicketRow) =>
  t.pod_mode === 'VIRTUAL' ? 'Virtual' : t.venue_name || t.zone_name || 'Physical';

const renderCode = (t: EventTicketRow) => (
  <Typography variant="body2" component="span" sx={{
    fontWeight: 800
  }}>
    {t.ticket_code}
  </Typography>
);

const renderEvent = (t: EventTicketRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <Typography
      variant="body2"
      component="span"
      sx={{
        fontWeight: 600,
        display: "block"
      }}>
      {t.pod_title}
    </Typography>
    <Typography
      variant="caption"
      component="span"
      sx={{
        color: "text.secondary",
        display: "block"
      }}>
      {eventCaption(t)}
    </Typography>
  </Box>
);

const renderAttendee = (t: EventTicketRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" component="span" sx={{
      display: "block"
    }}>
      {t.user_name}
    </Typography>
    <Typography
      variant="caption"
      component="span"
      sx={{
        color: "text.secondary",
        display: "block"
      }}>
      {t.user_email}
    </Typography>
  </Box>
);

const renderStatus = (t: EventTicketRow) => (
  <Box sx={{ lineHeight: 1.2 }} component="span">
    <StatusChip status={t.status} label={t.status.replace('_', ' ')} colorMap={STATUS_COLOR} />
    {t.checked_in_at && (
      <Typography
        variant="caption"
        component="span"
        sx={{
          color: "text.secondary",
          display: "block"
        }}>
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
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<EventTicketRow>[]>(() => {
    const renderActions = (ticket: EventTicketRow) => (
      <Stack direction="row" component="span" sx={{
        justifyContent: "flex-end"
      }}>
        <Tooltip title={t('admin.eventTickets.downloadTicket')}>
          <DuncitIconButton size="small" onClick={() => onDownload(ticket)} aria-label={t('admin.eventTickets.downloadTicket')}>
            <DownloadIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={ticket.status === 'CHECKED_IN' ? t('admin.eventTickets.checkedIn') : t('admin.eventTickets.checkIn')}>
          <span>
            <DuncitIconButton
              size="small"
              color="success"
              disabled={ticket.status !== 'VALID'}
              onClick={() => onCheckIn(ticket)}
              aria-label={t('admin.eventTickets.checkIn')}
            >
              <CheckCircleIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'ticket_code', headerName: t('admin.eventTickets.colTicket'), minWidth: 140, cellRenderer: renderCode, valueGetter: (t) => t.ticket_code },
      {
        field: 'pod_title',
        headerName: t('admin.eventTickets.colEvent'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderEvent,
        valueGetter: (t) => t.pod_title,
      },
      {
        field: 'user_name',
        headerName: t('admin.eventTickets.colAttendee'),
        flex: 1,
        minWidth: 180,
        cellRenderer: renderAttendee,
        valueGetter: (t) => t.user_name,
      },
      { field: 'pod_date_time', headerName: t('admin.eventTickets.colWhen'), minWidth: 170, valueGetter: (t) => fmt(t.pod_date_time) },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        filter: { type: 'select', options: statusOptions(t) },
        minWidth: 140,
        cellRenderer: renderStatus,
        valueGetter: (t) => t.status.replace('_', ' '),
      },
      {
        field: 'checked_in_at',
        headerName: t('admin.eventTickets.checkedIn'),
        filter: { type: 'date' },
        hide: true,
        minWidth: 170,
        valueGetter: (t) => fmt(t.checked_in_at),
      },
      {
        field: 'created_at',
        headerName: t('shell.common.created'),
        filter: { type: 'date' },
        hide: true,
        minWidth: 170,
        valueGetter: (t) => fmt(t.created_at),
      },
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onDownload, onCheckIn]);

  return (
    <DuncitTable<EventTicketRow>
      tableId="admin-event-tickets"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getTicketRowId}
      emptyText={t('admin.eventTickets.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search code, attendee or event"
      refetchRef={refetchRef}
    />
  );
}
