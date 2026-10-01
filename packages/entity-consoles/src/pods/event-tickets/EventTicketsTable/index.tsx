import { useMemo, type MutableRefObject } from 'react';
import { Stack, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { EventTicketRow } from '../queries';
import { useTranslation } from '@duncit/shell';
import { fmt, renderAttendee, renderCode, renderEvent, renderStatus } from './cells';

interface Props {
  fetchRows: TableFetch<EventTicketRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onDownload: (t: EventTicketRow) => void;
  onCheckIn: (t: EventTicketRow) => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const statusOptions = (t: Translate) => [
  { value: 'VALID', label: t('admin.eventTickets.valid') },
  { value: 'CHECKED_IN', label: t('admin.eventTickets.checkedIn') },
  { value: 'CANCELLED', label: t('admin.eventTickets.cancelled') },
];

const getTicketRowId = (t: EventTicketRow) => t.id;

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
      { field: 'ticket_code', headerName: t('admin.eventTickets.colTicket'), type: 'text', minWidth: 140, cellRenderer: renderCode, valueGetter: (t) => t.ticket_code },
      {
        field: 'pod_title',
        headerName: t('admin.eventTickets.colEvent'),
        type: 'text',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderEvent,
        valueGetter: (t) => t.pod_title,
      },
      {
        field: 'user_name',
        headerName: t('admin.eventTickets.colAttendee'),
        type: 'text',
        flex: 1,
        minWidth: 180,
        cellRenderer: renderAttendee,
        valueGetter: (t) => t.user_name,
      },
      { field: 'pod_date_time', headerName: t('admin.eventTickets.colWhen'), type: 'date', minWidth: 170, valueGetter: (t) => fmt(t.pod_date_time) },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        type: 'enum',
        options: statusOptions(t),
        minWidth: 140,
        cellRenderer: renderStatus,
        valueGetter: (t) => t.status.replace('_', ' '),
      },
      {
        field: 'checked_in_at',
        headerName: t('admin.eventTickets.checkedIn'),
        type: 'date',
        hide: true,
        minWidth: 170,
        valueGetter: (t) => fmt(t.checked_in_at),
      },
      {
        field: 'created_at',
        headerName: t('shell.common.created'),
        type: 'date',
        hide: true,
        minWidth: 170,
        valueGetter: (t) => fmt(t.created_at),
      },
      { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 110, cellRenderer: renderActions },
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
