import { useCallback, useMemo, useState } from 'react';
import { Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import {
  DuncitTable,
  type DuncitColumn,
  type TableFetch,
  type TableQueryState,
} from '@duncit/table';
import type { PodApprovalStatus, PodRow } from './queries';

/** Time buckets expressible as server-side pod_date_time filters. ('Ongoing'
 * vs 'Hosted' needs pod_end_date_time, which the server does not filter on.) */
type PodTimeFilter = 'all' | 'upcoming' | 'started';
const TIME_FILTERS: { value: PodTimeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'started', label: 'Started' },
];

const APPROVAL_COLOR: Record<PodApprovalStatus, 'default' | 'warning' | 'success' | 'error'> = {
  NONE: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  DECLINED: 'error',
};

const MODE_OPTIONS = [
  { value: 'PHYSICAL', label: 'PHYSICAL' },
  { value: 'VIRTUAL', label: 'VIRTUAL' },
];
const APPROVAL_OPTIONS = (['NONE', 'PENDING', 'APPROVED', 'DECLINED'] as const).map((s) => ({
  value: s,
  label: s,
}));

interface Props {
  tableId: string;
  fetchRows: TableFetch<PodRow>;
  formatDateTime: (input: string | null | undefined) => string;
  showHosts?: boolean;
  showApproval?: boolean;
  emptyText?: string;
}

const getPodRowId = (pod: PodRow) => pod.id;

const renderPod = (pod: PodRow) => (
  <>
    <Typography variant="body2" fontWeight={700}>{pod.pod_title}</Typography>
    <Typography variant="caption" color="text.secondary" display="block">{pod.club_slug || '—'}</Typography>
  </>
);

const hostsValue = (pod: PodRow) => pod.host_names.join(', ') || '—';

const renderMode = (pod: PodRow) => <Chip size="small" variant="outlined" label={pod.pod_mode} />;

const renderApproval = (pod: PodRow) => (
  <Chip size="small" color={APPROVAL_COLOR[pod.venue_approval_status]} label={pod.venue_approval_status} />
);

const statusValue = (pod: PodRow) => (pod.is_active ? 'Live' : 'Offline');

const renderStatus = (pod: PodRow) => (
  <Chip size="small" variant="outlined" color={pod.is_active ? 'success' : 'default'} label={statusValue(pod)} />
);

/** Server-driven pods table shared by the venue-details Pods tab and the
 * host-details Pods section. The container scopes fetchRows (venue_id /
 * host_user_id); the time toggle adds a pod_date_time filter on top. */
export default function PodsTable({
  tableId,
  fetchRows,
  formatDateTime,
  showHosts = false,
  showApproval = false,
  emptyText,
}: Readonly<Props>) {
  const [timeFilter, setTimeFilter] = useState<PodTimeFilter>('all');

  const scopedFetch = useCallback(
    async (q: TableQueryState) => {
      if (timeFilter === 'all') return fetchRows(q);
      const op = timeFilter === 'upcoming' ? ('gte' as const) : ('lte' as const);
      return fetchRows({
        ...q,
        filters: [...q.filters, { field: 'pod_date_time', op, value: new Date().toISOString() }],
      });
    },
    [fetchRows, timeFilter],
  );

  const columns = useMemo<DuncitColumn<PodRow>[]>(() => {
    const dateValue = (pod: PodRow) => formatDateTime(pod.pod_date_time) || '—';
    const cols: DuncitColumn<PodRow>[] = [
      {
        field: 'pod_title',
        headerName: 'Pod',
        flex: 1,
        minWidth: 180,
        cellRenderer: renderPod,
        valueGetter: (pod) => pod.pod_title,
      },
      {
        field: 'pod_date_time',
        headerName: 'Date & time',
        minWidth: 180,
        filter: { type: 'date' },
        valueGetter: dateValue,
      },
    ];
    if (showHosts) {
      cols.push({
        field: 'host_names',
        headerName: 'Host(s)',
        sortable: false,
        minWidth: 150,
        valueGetter: hostsValue,
      });
    }
    cols.push({
      field: 'pod_mode',
      headerName: 'Mode',
      width: 120,
      filter: { type: 'select', options: MODE_OPTIONS },
      cellRenderer: renderMode,
      valueGetter: (pod) => pod.pod_mode,
    });
    if (showApproval) {
      cols.push({
        field: 'venue_approval_status',
        headerName: 'Venue approval',
        width: 150,
        filter: { type: 'select', options: APPROVAL_OPTIONS },
        cellRenderer: renderApproval,
        valueGetter: (pod) => pod.venue_approval_status,
      });
    }
    cols.push({
      field: 'is_active',
      headerName: 'Status',
      width: 110,
      filter: { type: 'boolean' },
      cellRenderer: renderStatus,
      valueGetter: statusValue,
    });
    return cols;
  }, [formatDateTime, showHosts, showApproval]);

  return (
    <Stack spacing={1.5}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={timeFilter}
        onChange={(_e, next) => next && setTimeFilter(next)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {TIME_FILTERS.map((f) => (
          <ToggleButton key={f.value} value={f.value} sx={{ textTransform: 'none' }}>
            {f.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Remount on toggle so the query restarts from page 1 with the new scope. */}
      <DuncitTable<PodRow>
        key={timeFilter}
        tableId={tableId}
        columns={columns}
        fetchRows={scopedFetch}
        getRowId={getPodRowId}
        emptyText={emptyText ?? 'No pods in this view.'}
        defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
        searchPlaceholder="Search pod title or ID"
      />
    </Stack>
  );
}
