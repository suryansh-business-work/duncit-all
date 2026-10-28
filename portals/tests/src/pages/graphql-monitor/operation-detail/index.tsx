import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import LatencyKpis from '../components/LatencyKpis';
import MonitorCharts from '../components/MonitorCharts';
import TallyCards from '../components/TallyCards';
import OperationHeader from './OperationHeader';
import PhaseBreakdown from './PhaseBreakdown';
import LatencyDistribution from './LatencyDistribution';
import SignatureCard from './SignatureCard';
import TracesCard from './TracesCard';
import { MONITOR_POLL_MS, useMonitorRange, useSlowThreshold } from '../hooks';
import { GRAPHQL_MONITOR_OPERATION, type OperationDetail } from '../queries';

/**
 * One operation at its own address — GraphOS's operation page: traffic and
 * latency over time, the latency distribution, where the time goes, who calls
 * it, how it fails, its slowest traces and the document itself.
 */
export default function GraphqlOperationDetailPage() {
  const { operationId = '' } = useParams();
  const [range, setRange] = useMonitorRange();
  const slowMs = useSlowThreshold();
  const { data, loading, error } = useQuery<{ graphqlMonitorOperation: OperationDetail }>(GRAPHQL_MONITOR_OPERATION, {
    variables: { id: operationId, range },
    fetchPolicy: 'cache-and-network',
    pollInterval: MONITOR_POLL_MS,
  });
  const operation = data?.graphqlMonitorOperation;

  return (
    <QueryGuard loading={loading && !operation} error={error} errorText={error?.message}>
      {operation && (
        <Stack spacing={2.5} data-testid="graphql-monitor-operation-page">
          <OperationHeader operation={operation} range={range} onRangeChange={setRange} />
          <LatencyKpis numbers={operation} slowMs={slowMs} testId="graphql-monitor-operation" />
          <MonitorCharts series={operation.series} range={range} testId="graphql-monitor-operation" />
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ '& > *': { flex: 1, minWidth: 0 } }}>
            <LatencyDistribution buckets={operation.latency_distribution} />
            <PhaseBreakdown numbers={operation} />
          </Stack>
          <TallyCards clients={operation.clients} errorCodes={operation.error_codes} testId="graphql-monitor-operation" />
          <TracesCard operationId={operation.id} />
          <SignatureCard operation={operation} />
        </Stack>
      )}
    </QueryGuard>
  );
}
