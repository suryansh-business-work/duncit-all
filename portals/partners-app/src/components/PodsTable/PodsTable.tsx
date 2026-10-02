import { useMemo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn } from '@duncit/table';
import { formatDate } from '@duncit/app-settings';
import { POD_ROW_STATUS_COLORS, podRowStatus, podRowStatusLabel } from '@duncit/utils';
import { useTranslation } from '../../i18n';
import type { PodRowBase, Props } from './types';
import { attendeesValue, dateValue, getPodRowId, renderAttendance, renderAttendees } from './cells';

export default function PodsTable<T extends PodRowBase>({
  tableId,
  fetchRows,
  refetchRef,
  venueName,
  clubName,
  emptyText,
  toolbarActions,
  renderActions,
  actionsWidth = 120,
  renderMonitor,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<T>[]>(() => {
    const statusLabel = (pod: T) => podRowStatusLabel(podRowStatus(pod), t);
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
        type: 'text',
        cellRenderer: renderPod,
        valueGetter: (pod) => pod.pod_title,
      },
      {
        field: 'place',
        headerName: t('partners.components.place'),
        type: 'text',
        // A venue name looked up on the client from the pod's venue id — no stored path to order or match.
        sortable: false,
        filterable: false,
        minWidth: 150,
        valueGetter: placeValue,
      },
      {
        field: 'pod_date_time',
        headerName: t('partners.common.date'),
        type: 'date',
        minWidth: 175,
        valueGetter: dateValue,
      },
      {
        field: 'attendees',
        headerName: t('partners.common.attendees'),
        type: 'number',
        // Seats summed from the pod's bookings at read time — no stored count to order or match.
        sortable: false,
        filterable: false,
        width: 120,
        cellRenderer: renderAttendees,
        valueGetter: attendeesValue,
      },
      {
        // Booked seats alone no longer explain a completed pod's payout — it is
        // settled on the seats scanned at the door, so both are shown.
        field: 'attendance',
        headerName: t('partners.components.attendance'),
        type: 'number',
        // Tallied from the pod's tickets per row — the pod document holds no path to order or match.
        sortable: false,
        filterable: false,
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
        type: 'boolean',
        width: 120,
        cellRenderer: renderStatus,
        valueGetter: statusLabel,
      },
      {
        field: 'pod_amount',
        headerName: t('partners.common.amount'),
        type: 'number',
        hide: true,
        width: 110,
        valueGetter: (pod) => pod.pod_amount ?? 0,
      },
      {
        field: 'completed_at',
        headerName: t('partners.common.completed'),
        type: 'date',
        hide: true,
        width: 140,
        valueGetter: (pod) => formatDate(pod.completed_at) || '—',
      },
    ];
    if (renderMonitor) {
      cols.push({
        field: 'ai_monitor',
        headerName: t('shell.nav.aiMonitoring'),
        type: 'actions',
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
        type: 'actions',
        width: actionsWidth,
        cellRenderer: renderActions,
      });
    }
    return cols;
  }, [actionsWidth, clubName, venueName, renderActions, renderMonitor, t]);

  return (
    <DuncitTable<T>
      tableId={tableId}
      ariaLabel={t('shell.nav.pods')}
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
