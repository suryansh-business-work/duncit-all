import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { AttendanceChip } from '@duncit/ui';
import { formatDate, formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '../i18n';
import { POD_ROW_STATUS_COLORS, POD_ROW_STATUS_KEYS, podRowStatus } from './pod-status';

/** Minimal row shape shared by the partner + club-admin pods tables. */
export interface PodRowBase {
  id: string;
  pod_title: string;
  club_id?: string | null;
  venue_id?: string | null;
  pod_mode?: string | null;
  pod_date_time?: string | null;
  pod_amount?: number | null;
  pod_attendees?: string[] | null;
  /** Seats scanned in at the door — what a completed pod settles on. */
  attendance?: { attended_seats: number; booked_seats: number; recorded: boolean } | null;
  is_active: boolean;
  completed_at?: string | null;
  /** Optional booking-cycle state — the club-admin list shows every stage, the
   * host list does not select them. */
  is_deleted?: boolean | null;
  venue_approval_status?: string | null;
}

interface Props<T extends PodRowBase> {
  tableId: string;
  fetchRows: TableFetch<T>;
  refetchRef?: MutableRefObject<(() => void) | null>;
  venueName: (id?: string | null) => string;
  /** When provided, the club name renders as a caption under the pod title. */
  clubName?: (id: string) => string;
  emptyText: string;
  toolbarActions?: ReactNode;
  /** When provided, a trailing Actions column renders this per row. */
  renderActions?: (pod: T) => ReactNode;
  /** When provided, an "AI Monitoring" column renders this per row — the
   * club-admin list passes the activity-dialog pill; the host list does not. */
  renderMonitor?: (pod: T) => ReactNode;
}

const renderAttendance = (pod: PodRowBase) => <AttendanceChip attendance={pod.attendance} />;

const dateValue = (pod: PodRowBase) =>
  formatDateTime(pod.pod_date_time) || 'Not scheduled';

const attendeesValue = (pod: PodRowBase) => pod.pod_attendees?.length ?? 0;

const getPodRowId = (pod: PodRowBase) => pod.id;

export default function PodsTable<T extends PodRowBase>({
  tableId,
  fetchRows,
  refetchRef,
  venueName,
  clubName,
  emptyText,
  toolbarActions,
  renderActions,
  renderMonitor,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<T>[]>(() => {
    const statusLabel = (pod: T) => t(POD_ROW_STATUS_KEYS[podRowStatus(pod)]);
    const renderStatus = (pod: T) => (
      <Chip
        size="small"
        label={statusLabel(pod)}
        color={POD_ROW_STATUS_COLORS[podRowStatus(pod)]}
      />
    );
    const renderPod = (pod: T) => (
      <Box sx={{ lineHeight: 1.2 }}>
        <Typography variant="body2" component="div" sx={{
          fontWeight: 900
        }}>
          {pod.pod_title}
        </Typography>
        {clubName && pod.club_id && (
          <Typography variant="caption" component="div" sx={{
            color: "text.secondary"
          }}>
            {clubName(pod.club_id)}
          </Typography>
        )}
      </Box>
    );
    const placeValue = (pod: T) =>
      pod.pod_mode === 'VIRTUAL' ? 'Virtual pod' : venueName(pod.venue_id);
    const cols: DuncitColumn<T>[] = [
      {
        field: 'pod_title',
        headerName: t('partners.common.pod'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderPod,
        valueGetter: (pod) => pod.pod_title,
      },
      { field: 'place', headerName: t('partners.components.place'), sortable: false, minWidth: 150, valueGetter: placeValue },
      {
        field: 'pod_date_time',
        headerName: t('partners.common.date'),
        filter: { type: 'date' },
        minWidth: 175,
        valueGetter: dateValue,
      },
      { field: 'attendees', headerName: t('partners.common.attendees'), sortable: false, width: 110, valueGetter: attendeesValue },
      {
        // Booked seats alone no longer explain a completed pod's payout — it is
        // settled on the seats scanned at the door, so both are shown.
        field: 'attendance',
        headerName: t('partners.components.attendance'),
        sortable: false,
        width: 150,
        cellRenderer: renderAttendance,
        valueGetter: (p: PodRowBase) =>
          p.attendance?.booked_seats
            ? `${p.attendance.attended_seats}/${p.attendance.booked_seats}`
            : '',
      },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        filter: { type: 'boolean' },
        width: 120,
        cellRenderer: renderStatus,
        valueGetter: statusLabel,
      },
      {
        field: 'pod_amount',
        headerName: t('partners.common.amount'),
        filter: { type: 'number' },
        hide: true,
        width: 110,
        valueGetter: (pod) => pod.pod_amount ?? 0,
      },
      {
        field: 'completed_at',
        headerName: t('partners.common.completed'),
        filter: { type: 'date' },
        hide: true,
        width: 140,
        valueGetter: (pod) => formatDate(pod.completed_at) || '—',
      },
    ];
    if (renderMonitor) {
      cols.push({
        field: 'ai_monitor',
        headerName: t('shell.nav.aiMonitoring'),
        sortable: false,
        width: 150,
        cellRenderer: renderMonitor,
        // Renderer-only column: keyed on the title the activity dialog shows,
        // so the cell repaints when an edit renames the pod.
        valueGetter: (pod) => pod.pod_title,
      });
    }
    if (renderActions) {
      cols.push({
        field: 'actions',
        headerName: t('shell.common.actions'),
        sortable: false,
        width: 120,
        cellRenderer: renderActions,
      });
    }
    return cols;
  }, [clubName, venueName, renderActions, renderMonitor, t]);

  return (
    <DuncitTable<T>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPodRowId}
      toolbarActions={toolbarActions}
      emptyText={emptyText}
      defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
      searchPlaceholder="Search pod title or ID"
      refetchRef={refetchRef}
    />
  );
}
