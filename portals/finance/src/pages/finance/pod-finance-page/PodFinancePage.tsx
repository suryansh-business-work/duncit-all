import { useCallback, useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Stack, Typography } from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import { DuncitTable, type DuncitColumn, type TableQueryState } from '@duncit/table';
import {
  POD_FINANCE_RELEASES,
  applyPodFinanceQuery,
  groupReleasesByPod,
  money,
  type PodFinanceGroup,
  type PodReleaseRow,
} from './queries';

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

function StatusCountChips({ counts }: Readonly<{ counts: Record<string, number> }>) {
  return (
    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" component="span">
      {Object.entries(counts).map(([status, count]) => (
        <Chip key={status} size="small" label={`${count} ${status}`} color={STATUS_COLORS[status] ?? 'default'} />
      ))}
    </Stack>
  );
}

interface QueryData {
  paymentReleaseRequests: PodReleaseRow[];
  publicFinanceSettings: { currency_symbol: string };
}

const getGroupRowId = (g: PodFinanceGroup) => g.pod_id;

const renderPod = (g: PodFinanceGroup) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {g.pod_title}
  </Typography>
);

const renderStatuses = (g: PodFinanceGroup) => <StatusCountChips counts={g.status_counts} />;

const statusesValue = (g: PodFinanceGroup) =>
  Object.entries(g.status_counts)
    .map(([status, count]) => `${count} ${status}`)
    .join(', ');

const lastActivityValue = (g: PodFinanceGroup) => {
  const d = new Date(g.last_requested_at);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN');
};

export default function PodFinancePage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [sym, setSym] = useState('');

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<QueryData>({
        query: POD_FINANCE_RELEASES,
        fetchPolicy: 'network-only',
      });
      setSym(data?.publicFinanceSettings?.currency_symbol ?? '');
      return applyPodFinanceQuery(groupReleasesByPod(data?.paymentReleaseRequests ?? []), q);
    },
    [client],
  );

  const columns = useMemo<DuncitColumn<PodFinanceGroup>[]>(
    () => [
      { field: 'pod_title', headerName: 'Pod', flex: 1, minWidth: 200, cellRenderer: renderPod },
      { field: 'releases_count', headerName: 'Releases', width: 110 },
      {
        field: 'requested_total',
        headerName: 'Requested',
        width: 130,
        valueGetter: (g) => money(sym, g.requested_total),
      },
      {
        field: 'status_counts',
        headerName: 'Release statuses',
        sortable: false,
        minWidth: 220,
        cellRenderer: renderStatuses,
        valueGetter: statusesValue,
      },
      {
        field: 'last_requested_at',
        headerName: 'Last activity',
        hide: true,
        width: 170,
        valueGetter: lastActivityValue,
      },
    ],
    [sym],
  );

  const openDetail = useCallback(
    (g: PodFinanceGroup) => navigate(`/pod-finance/${g.pod_id}`),
    [navigate],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <AnalyticsIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>Pod Finance</Typography>
          <Typography variant="body2" color="text.secondary">
            Pods with money movement — open a pod to see its full financial waterfall.
          </Typography>
        </Box>
      </Stack>

      <DuncitTable<PodFinanceGroup>
        tableId="finance-pod-finance"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getGroupRowId}
        onRowClick={openDetail}
        emptyText="No pods with payment activity yet."
        defaultSort={{ field: 'last_requested_at', dir: 'desc' }}
        searchPlaceholder="Search pod title"
      />
    </Box>
  );
}
