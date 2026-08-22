import { Avatar, Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { AttendanceChip } from '@duncit/ui';
import type { DuncitColumn } from '@duncit/table';
import PodActionButtons from './PodActionButtons';
import AiMonitorPill from '../pod-monitoring/AiMonitorPill';
import type { PodRow } from './queries';
import {
  POD_MODE_OPTIONS,
  POD_TYPE_OPTIONS,
  dateValue,
  modeLabel,
  productLines,
  productsValue,
  spotsValue,
  statusValue,
  typeValue,
} from './podsColumns.values';

const renderCover = (p: PodRow) => {
  const first = p.pod_images_and_videos?.[0];
  if (first?.type === 'VIDEO') {
    return (
      <Box
        component="video"
        src={first.url}
        muted
        playsInline
        preload="metadata"
        sx={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 1, display: 'block' }}
      />
    );
  }
  return (
    <Avatar variant="rounded" src={first?.url} sx={{ width: 32, height: 32 }}>
      {p.pod_title[0]}
    </Avatar>
  );
};

const renderTitle = (p: PodRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={600} component="div">
      {p.pod_title}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
      {p.pod_id}
    </Typography>
  </Box>
);

const renderType = (p: PodRow) => (
  <Stack direction="row" spacing={0.5} component="span">
    <Chip size="small" label={modeLabel(p)} />
    <Chip
      size="small"
      label={p.pod_type.replaceAll('_', ' ')}
      color={p.pod_type.includes('FREE') ? 'default' : 'primary'}
    />
  </Stack>
);

const renderHits = (p: PodRow) => (
  <Stack direction="row" alignItems="center" spacing={0.5} component="span">
    <VisibilityIcon fontSize="inherit" color="action" />
    <Typography variant="caption">{p.pod_hits}</Typography>
  </Stack>
);

const renderStatus = (p: PodRow, t: PodsColumnDeps['t']) => {
  if (p.is_deleted) return <Chip size="small" label={t('admin.eventTickets.cancelled')} color="error" />;
  if (p.completed_at) return <Chip size="small" label={t('admin.podsDashboard.completed')} color="info" />;
  if (p.venue_approval_status === 'PENDING') {
    return <Chip size="small" label={t('admin.podsDashboard.awaitingVenue')} color="warning" />;
  }
  if (p.venue_approval_status === 'DECLINED') {
    return <Chip size="small" label={t('admin.pods.venueRejected')} color="error" variant="outlined" />;
  }
  if (p.is_active) return <Chip size="small" label={t('admin.profile.active')} color="success" />;
  return <Chip size="small" label={t('admin.pods.draft')} color="default" />;
};

const renderProducts = (p: PodRow) => {
  const items = p.product_requests ?? [];
  if (items.length === 0) return '—';
  return (
    <Tooltip title={productLines(p)}>
      <Typography variant="caption" fontWeight={700} component="span">
        {items.length} product{items.length === 1 ? '' : 's'} · ₹{p.product_cost_total ?? 0}
      </Typography>
    </Tooltip>
  );
};

export interface PodsColumnDeps {
  /** Column headings and the status chips are copy — the page hands its
   *  translator down rather than a column module reaching for a hook. */
  t: (key: string) => string;
  showProducts: boolean;
  clubName: (id: string) => string;
  venueName: (id: string) => string;
  locName: (id: string) => string;
  onEdit: (p: PodRow) => void;
  onQuickEdit: (p: PodRow) => void;
  onDelete: (p: PodRow) => void;
  onComplete: (p: PodRow) => void;
  onMonitor: (p: PodRow) => void;
}

export function buildPodsColumns(deps: Readonly<PodsColumnDeps>): DuncitColumn<PodRow>[] {
  const { showProducts, clubName, venueName, locName, onEdit, onQuickEdit, onDelete, onComplete, onMonitor, t } = deps;
  const placeValue = (p: PodRow) => {
    if (p.pod_mode === 'VIRTUAL') return p.meeting_platform ?? 'Virtual';
    if (p.venue_id) return venueName(p.venue_id);
    return locName(p.location_id ?? '');
  };
  const renderActions = (p: PodRow) => (
    <PodActionButtons pod={p} onEdit={onEdit} onQuickEdit={onQuickEdit} onDelete={onDelete} onComplete={onComplete} />
  );
  const columns: DuncitColumn<PodRow>[] = [
    { field: 'cover', headerName: t('admin.pods.colCover'), sortable: false, width: 76, cellRenderer: renderCover },
    {
      field: 'pod_title',
      headerName: t('shell.common.title'),
      flex: 1,
      minWidth: 200,
      cellRenderer: renderTitle,
      valueGetter: (p) => p.pod_title,
    },
    {
      field: 'club_id',
      headerName: t('admin.pods.colClub'),
      minWidth: 140,
      valueGetter: (p) => clubName(p.club_id),
    },
    { field: 'place', headerName: t('admin.pods.colVenue'), sortable: false, minWidth: 140, valueGetter: placeValue },
    {
      field: 'pod_date_time',
      headerName: t('admin.pods.colDateTime'),
      filter: { type: 'date' },
      width: 170,
      valueGetter: (p) => dateValue(p.pod_date_time),
    },
    {
      field: 'pod_mode',
      headerName: t('shell.common.type'),
      filter: { type: 'select', options: POD_MODE_OPTIONS },
      minWidth: 210,
      cellRenderer: renderType,
      valueGetter: typeValue,
    },
    {
      field: 'pod_type',
      headerName: t('admin.pods.colPodType'),
      filter: { type: 'select', options: POD_TYPE_OPTIONS },
      hide: true,
      minWidth: 150,
      valueGetter: (p) => p.pod_type.replaceAll('_', ' '),
    },
    {
      field: 'pod_amount',
      headerName: t('admin.pods.colAmount'),
      filter: { type: 'number' },
      width: 110,
      valueGetter: (p) => (p.pod_amount > 0 ? `₹${p.pod_amount}` : 'Free'),
    },
    { field: 'no_of_spots', headerName: t('admin.pods.colSpots'), width: 100, valueGetter: spotsValue },
    {
      // What a completed pod is settled on — booked seats alone no longer
      // explain the payout, so the scanned count sits beside them.
      field: 'attendance',
      headerName: t('admin.pods.colAttendance'),
      sortable: false,
      width: 150,
      cellRenderer: (p: PodRow) => <AttendanceChip attendance={p.attendance} />,
      valueGetter: (p: PodRow) =>
        p.attendance?.booked_seats
          ? `${p.attendance.attended_seats}/${p.attendance.booked_seats}`
          : '',
    },
    { field: 'pod_hits', headerName: t('admin.pods.colHits'), width: 90, cellRenderer: renderHits, valueGetter: (p) => p.pod_hits },
    {
      field: 'is_active',
      headerName: t('shell.common.status'),
      filter: { type: 'boolean' },
      width: 120,
      cellRenderer: (row: PodRow) => renderStatus(row, t),
      valueGetter: statusValue,
    },
    {
      field: 'completed_at',
      headerName: t('admin.podsDashboard.completed'),
      filter: { type: 'date' },
      hide: true,
      width: 130,
      valueGetter: (p) => dateValue(p.completed_at),
    },
    {
      field: 'created_at',
      headerName: t('shell.common.created'),
      filter: { type: 'date' },
      hide: true,
      width: 130,
      valueGetter: (p) => dateValue(p.created_at),
    },
    {
      field: 'ai_monitor',
      headerName: t('admin.pods.colAiMonitoring'),
      sortable: false,
      width: 150,
      cellRenderer: (p: PodRow) => <AiMonitorPill onClick={() => onMonitor(p)} />,
      // Renderer-only column: keyed on the title the activity dialog shows,
      // so the cell repaints when an edit renames the pod.
      valueGetter: (p) => p.pod_title,
    },
    { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 170, cellRenderer: renderActions },
  ];
  if (showProducts) {
    columns.splice(8, 0, {
      field: 'products',
      headerName: t('admin.pods.colProducts'),
      sortable: false,
      minWidth: 150,
      cellRenderer: renderProducts,
      valueGetter: productsValue,
    });
  }
  return columns;
}
