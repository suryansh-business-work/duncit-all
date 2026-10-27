import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import MonitorHeader from '../components/MonitorHeader';
import OperationsTable from './OperationsTable';
import { MONITOR_POLL_MS, useMonitorRange, useSlowThreshold } from '../hooks';
import { GRAPHQL_MONITOR_OPERATIONS, type OperationSummary } from '../queries';

const EMPTY: OperationSummary[] = [];

/**
 * Tech > GraphQL Monitor > Operations — every document a client sent in the
 * range, one row per signature, with its traffic, error rate and latency.
 */
export default function GraphqlOperationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [range, setRange] = useMonitorRange();
  const slowMs = useSlowThreshold();
  const { data, loading, error } = useQuery<{ graphqlMonitorOperations: OperationSummary[] }>(
    GRAPHQL_MONITOR_OPERATIONS,
    { variables: { range }, fetchPolicy: 'cache-and-network', pollInterval: MONITOR_POLL_MS }
  );

  const open = useCallback(
    (row: OperationSummary) => navigate(`/graphql-monitor/operations/${row.id}?range=${range}`),
    [navigate, range]
  );

  return (
    <Stack spacing={2.5} data-testid="graphql-monitor-operations-page">
      <MonitorHeader
        title={t('tech.graphqlMonitor.operationsTitle')}
        subtitle={t('tech.graphqlMonitor.operationsSubtitle')}
        range={range}
        onRangeChange={setRange}
        testId="graphql-monitor-operations"
      />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        <OperationsTable operations={data?.graphqlMonitorOperations ?? EMPTY} slowMs={slowMs} onOpen={open} />
      </QueryGuard>
    </Stack>
  );
}
