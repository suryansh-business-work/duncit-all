import { useCallback, useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import { StatusChip } from '@duncit/ui';
import { DuncitTable, clientTableFetch, type DuncitColumn, type TableQueryState } from '@duncit/table';
import {
  POD_FINANCE_RELEASES,
  groupReleasesByPod,
  money,
  type PodFinanceGroup,
  type PodReleaseRow,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

function StatusCountChips({ counts }: Readonly<{ counts: Record<string, number> }>) {
  return (
    <Stack direction="row" spacing={0.5} useFlexGap component="span" sx={{
      flexWrap: "wrap"
    }}>
      {Object.entries(counts).map(([status, count]) => (
        <StatusChip key={status} status={status} label={`${count} ${status}`} colorMap={STATUS_COLORS} />
      ))}
    </Stack>
  );
}

interface QueryData {
  paymentReleaseRequests: PodReleaseRow[];
  publicFinanceSettings: { currency_symbol: string };
}

const getGroupRowId = (g: PodFinanceGroup) => g.pod_id;

const searchGroup = (g: PodFinanceGroup) => g.pod_title;

const renderPod = (g: PodFinanceGroup) => (
  <Typography variant="body2" component="span" sx={{
    fontWeight: 700
  }}>
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const [sym, setSym] = useState('');

  const columns = useMemo<DuncitColumn<PodFinanceGroup>[]>(
    () => [
      { field: 'pod_title', headerName: t('finance.common.pod'), flex: 1, minWidth: 200, type: 'text', cellRenderer: renderPod },
      { field: 'releases_count', headerName: t('finance.podFinance.releases'), width: 110, type: 'number' },
      {
        field: 'requested_total',
        headerName: t('finance.common.requested'),
        width: 130,
        type: 'number',
        valueGetter: (g) => money(sym, g.requested_total),
      },
      {
        field: 'status_counts',
        headerName: t('finance.podFinance.releaseStatuses'),
        type: 'text',
        // A per-status count map assembled in JS — no single value to order or match.
        sortable: false,
        filterable: false,
        minWidth: 220,
        cellRenderer: renderStatuses,
        valueGetter: statusesValue,
      },
      {
        field: 'last_requested_at',
        headerName: t('finance.podFinance.lastActivity'),
        hide: true,
        width: 170,
        type: 'date',
        valueGetter: lastActivityValue,
      },
    ],
    [sym],
  );

  // There is no grouped server *Table query for pod finance: the flat releases
  // are fetched, grouped per pod, then searched/filtered/sorted/paged in memory.
  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<QueryData>({
        query: POD_FINANCE_RELEASES,
        fetchPolicy: 'network-only',
      });
      setSym(data?.publicFinanceSettings?.currency_symbol ?? '');
      const groups = groupReleasesByPod(data?.paymentReleaseRequests ?? []);
      return clientTableFetch(groups, searchGroup, columns)(q);
    },
    [client, columns],
  );

  const openDetail = useCallback(
    (g: PodFinanceGroup) => navigate(`/pod-finance/${g.pod_id}`),
    [navigate],
  );

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 3
        }}>
        <AnalyticsIcon color="primary" />
        <Box>
          <Typography component="h1" variant="h5" sx={{
            fontWeight: 700
          }}>{t('shell.nav.podFinance')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Pods with money movement — open a pod to see its full financial waterfall.
          </Typography>
        </Box>
      </Stack>

      <DuncitTable<PodFinanceGroup>
        ariaLabel={t('shell.nav.podFinance')}
        tableId="finance-pod-finance"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getGroupRowId}
        onRowClick={openDetail}
        emptyText={t('finance.podFinance.noPodsWithPaymentActivityYet')}
        defaultSort={{ field: 'last_requested_at', dir: 'desc' }}
        searchPlaceholder="Search pod title"
      />
    </Box>
  );
}
