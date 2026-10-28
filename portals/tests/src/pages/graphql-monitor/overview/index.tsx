import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import MonitorHeader from '../components/MonitorHeader';
import LatencyKpis from '../components/LatencyKpis';
import MonitorCharts from '../components/MonitorCharts';
import TallyCards from '../components/TallyCards';
import TopOperations from './TopOperations';
import { MONITOR_POLL_MS, useMonitorRange, useSlowThreshold } from '../hooks';
import {
  GRAPHQL_MONITOR_OPERATIONS,
  GRAPHQL_MONITOR_OVERVIEW,
  type MonitorOverview,
  type OperationSummary,
} from '../queries';

const EMPTY: OperationSummary[] = [];

/**
 * Tech > GraphQL Monitor > Overview — the whole API at a glance: how much
 * traffic, how fast, how often it fails, who is calling, and which operations
 * deserve a look first.
 */
export default function GraphqlMonitorOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [range, setRange] = useMonitorRange();
  const slowMs = useSlowThreshold();
  const polling = { variables: { range }, fetchPolicy: 'cache-and-network' as const, pollInterval: MONITOR_POLL_MS };
  const overviewQuery = useQuery<{ graphqlMonitorOverview: MonitorOverview }>(GRAPHQL_MONITOR_OVERVIEW, polling);
  const operationsQuery = useQuery<{ graphqlMonitorOperations: OperationSummary[] }>(GRAPHQL_MONITOR_OPERATIONS, polling);
  const overview = overviewQuery.data?.graphqlMonitorOverview;

  const open = useCallback(
    (row: OperationSummary) => navigate(`/graphql-monitor/operations/${row.id}?range=${range}`),
    [navigate, range]
  );
  const leading = useMemo(
    () => [
      {
        id: 'operations',
        label: t('tech.graphqlMonitor.kpiOperations'),
        value: String(overview?.operation_count ?? 0),
        hint: t('tech.graphqlMonitor.kpiOperationsHint'),
      },
    ],
    [overview?.operation_count, t]
  );

  return (
    <Stack spacing={2.5} data-testid="graphql-monitor-overview-page">
      <MonitorHeader
        title={t('tech.graphqlMonitor.overviewTitle')}
        subtitle={t('tech.graphqlMonitor.overviewSubtitle')}
        range={range}
        onRangeChange={setRange}
        testId="graphql-monitor-overview"
      />
      <QueryGuard
        loading={overviewQuery.loading && !overview}
        error={overviewQuery.error}
        errorText={overviewQuery.error?.message}
      >
        {overview && (
          <Stack spacing={2.5}>
            <LatencyKpis numbers={overview} slowMs={slowMs} leading={leading} testId="graphql-monitor-overview" />
            <MonitorCharts series={overview.series} range={range} testId="graphql-monitor-overview" />
            <TopOperations operations={operationsQuery.data?.graphqlMonitorOperations ?? EMPTY} onOpen={open} />
            <TallyCards clients={overview.clients} errorCodes={overview.error_codes} testId="graphql-monitor-overview" />
          </Stack>
        )}
      </QueryGuard>
    </Stack>
  );
}
