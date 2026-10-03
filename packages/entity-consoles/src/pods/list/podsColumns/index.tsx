import { AttendanceChip } from '@duncit/ui';
import type { DuncitColumn } from '@duncit/table';
import ClubLocationLabel from '../ClubLocationLabel';
import PodActionButtons from '../PodActionButtons';
import PodSpotsCell from '../PodSpotsCell';
import AiMonitorPill from '../../monitoring/AiMonitorPill';
import type { PodRow } from '../queries';
import {
  POD_TYPE_OPTIONS,
  dateValue,
  podModeOptions,
  productsValue,
  spotsValue,
  statusValue,
  typeValue,
} from '../podsColumns.values';
import {
  renderCover,
  renderHits,
  renderProducts,
  renderStatus,
  renderTitle,
  renderType,
} from './renderers';
import type { PodsColumnDeps } from './types';

export type { PodsColumnDeps } from './types';

export function buildPodsColumns(deps: Readonly<PodsColumnDeps>): DuncitColumn<PodRow>[] {
  const { showProducts, clubName, clubLocation, venueName, locName, minPax } = deps;
  const { onEdit, onQuickEdit, onDelete, onComplete, onMonitor, t } = deps;
  const clubValue = (p: PodRow) => {
    const location = clubLocation(p.club_id);
    return location ? `${clubName(p.club_id)} | ${location}` : clubName(p.club_id);
  };
  const placeValue = (p: PodRow) => {
    if (p.pod_mode === 'VIRTUAL') return p.meeting_platform ?? 'Virtual';
    if (p.venue_id) return venueName(p.venue_id);
    return locName(p.location_id ?? '');
  };
  const renderActions = (p: PodRow) => (
    <PodActionButtons pod={p} onEdit={onEdit} onQuickEdit={onQuickEdit} onDelete={onDelete} onComplete={onComplete} />
  );
  const columns: DuncitColumn<PodRow>[] = [
    { field: 'cover', headerName: t('admin.pods.colCover'), type: 'text', width: 76, cellRenderer: renderCover },
    {
      field: 'pod_title',
      headerName: t('shell.common.title'),
      type: 'text',
      flex: 1,
      minWidth: 200,
      cellRenderer: renderTitle,
      valueGetter: (p) => p.pod_title,
    },
    {
      field: 'club_id',
      headerName: t('admin.pods.colClub'),
      type: 'text',
      // The stored value is an ObjectId: a text match cannot be cast to one. The club select above filters it.
      filterable: false,
      minWidth: 220,
      // The export and quick search read the joined text; the cell shows the pin icon.
      valueGetter: clubValue,
      cellRenderer: (p: PodRow) => <ClubLocationLabel name={clubName(p.club_id)} location={clubLocation(p.club_id)} />,
    },
    {
      field: 'place',
      headerName: t('admin.pods.colVenue'),
      type: 'text',
      // Assembled per row from the meeting platform, the venue or the location — no single stored field.
      sortable: false,
      filterable: false,
      minWidth: 140,
      valueGetter: placeValue,
    },
    {
      field: 'pod_date_time',
      headerName: t('admin.pods.colDateTime'),
      type: 'date',
      width: 170,
      valueGetter: (p) => dateValue(p.pod_date_time),
    },
    {
      field: 'pod_mode',
      headerName: t('shell.common.type'),
      type: 'enum',
      options: podModeOptions(t),
      minWidth: 210,
      cellRenderer: renderType,
      valueGetter: typeValue,
    },
    {
      field: 'pod_type',
      headerName: t('admin.pods.colPodType'),
      type: 'enum',
      options: POD_TYPE_OPTIONS,
      hide: true,
      minWidth: 150,
      valueGetter: (p) => p.pod_type.replaceAll('_', ' '),
    },
    {
      field: 'pod_amount',
      headerName: t('admin.pods.colAmount'),
      type: 'number',
      width: 110,
      valueGetter: (p) => (p.pod_amount > 0 ? `₹${p.pod_amount}` : 'Free'),
    },
    {
      field: 'no_of_spots',
      headerName: t('admin.pods.colSpots'),
      type: 'number',
      width: 120,
      cellRenderer: (p: PodRow) => <PodSpotsCell pod={p} minPax={minPax(p.club_id)} t={t} />,
      valueGetter: spotsValue,
    },
    {
      // What a completed pod is settled on — booked seats alone no longer
      // explain the payout, so the scanned count sits beside them.
      field: 'attendance',
      headerName: t('admin.pods.colAttendance'),
      type: 'number',
      // Counted per row from the pod's tickets — not a field stored on the pod.
      sortable: false,
      filterable: false,
      width: 150,
      cellRenderer: (p: PodRow) => <AttendanceChip attendance={p.attendance} />,
      valueGetter: (p: PodRow) =>
        p.attendance?.booked_seats
          ? `${p.attendance.attended_seats}/${p.attendance.booked_seats}`
          : '',
    },
    { field: 'pod_hits', headerName: t('admin.pods.colHits'), type: 'number', width: 90, cellRenderer: renderHits, valueGetter: (p) => p.pod_hits },
    {
      field: 'is_active',
      headerName: t('shell.common.status'),
      type: 'boolean',
      width: 120,
      cellRenderer: (row: PodRow) => renderStatus(row, t),
      valueGetter: statusValue,
    },
    {
      field: 'completed_at',
      headerName: t('admin.podsDashboard.completed'),
      type: 'date',
      hide: true,
      width: 130,
      valueGetter: (p) => dateValue(p.completed_at),
    },
    {
      field: 'created_at',
      headerName: t('shell.common.created'),
      type: 'date',
      hide: true,
      width: 130,
      valueGetter: (p) => dateValue(p.created_at),
    },
    {
      field: 'ai_monitor',
      headerName: t('admin.pods.colAiMonitoring'),
      type: 'actions',
      width: 150,
      cellRenderer: (p: PodRow) => <AiMonitorPill onClick={() => onMonitor(p)} />,
      // Renderer-only column: keyed on the title the activity dialog shows,
      // so the cell repaints when an edit renames the pod.
      valueGetter: (p) => p.pod_title,
    },
    { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 170, cellRenderer: renderActions },
  ];
  if (showProducts) {
    columns.splice(8, 0, {
      field: 'products',
      headerName: t('admin.pods.colProducts'),
      type: 'text',
      minWidth: 150,
      cellRenderer: renderProducts,
      valueGetter: productsValue,
    });
  }
  return columns;
}
