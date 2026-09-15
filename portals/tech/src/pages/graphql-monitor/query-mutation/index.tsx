import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import MonitorHeader from '../components/MonitorHeader';
import OperationsTable from '../operations/OperationsTable';
import { MONITOR_POLL_MS, useMonitorRange, useSlowThreshold } from '../hooks';
import { GRAPHQL_MONITOR_OPERATIONS, type OperationSummary, type OperationType } from '../queries';

type OperationScope = Extract<OperationType, 'QUERY' | 'MUTATION'>;

const EMPTY: OperationSummary[] = [];

/**
 * Tech > GraphQL Monitor > Query & Mutation — every operation a client sent
 * in the range, split by kind so a query's traffic never buries a mutation's
 * in one long list. A row opens the same dynamic operation page Operations
 * does: traffic, latency, errors and traces for that one document.
 */
export default function GraphqlQueryMutationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [range, setRange] = useMonitorRange();
  const slowMs = useSlowThreshold();
  const { data, loading, error } = useQuery<{ graphqlMonitorOperations: OperationSummary[] }>(
    GRAPHQL_MONITOR_OPERATIONS,
    { variables: { range }, fetchPolicy: 'cache-and-network', pollInterval: MONITOR_POLL_MS }
  );
  const operations = data?.graphqlMonitorOperations ?? EMPTY;

  const counts = useMemo(
    () => ({
      queries: operations.filter((op) => op.type === 'QUERY').length,
      mutations: operations.filter((op) => op.type === 'MUTATION').length,
    }),
    [operations]
  );

  const items = useMemo<DuncitTabItem<OperationScope>[]>(
    () => [
      { value: 'QUERY', label: t('tech.graphqlMonitor.scopeQueries', { vars: { total: counts.queries } }) },
      { value: 'MUTATION', label: t('tech.graphqlMonitor.scopeMutations', { vars: { total: counts.mutations } }) },
    ],
    [counts, t]
  );
  const tabs = useTabParam<OperationScope>({ items, fallback: 'QUERY' });
  const visible = useMemo(() => operations.filter((op) => op.type === tabs.value), [operations, tabs.value]);

  const open = useCallback(
    (row: OperationSummary) => navigate(`/graphql-monitor/operations/${row.id}?range=${range}`),
    [navigate, range]
  );

  return (
    <Stack spacing={2.5} data-testid="graphql-monitor-query-mutation-page">
      <MonitorHeader
        title={t('tech.graphqlMonitor.queryMutationTitle')}
        subtitle={t('tech.graphqlMonitor.queryMutationSubtitle')}
        range={range}
        onRangeChange={setRange}
        testId="graphql-monitor-query-mutation"
      />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        <Stack spacing={2}>
          <DuncitTabs {...tabs} data-testid="graphql-monitor-query-mutation-tabs" />
          <OperationsTable key={tabs.value} operations={visible} slowMs={slowMs} onOpen={open} />
        </Stack>
      </QueryGuard>
    </Stack>
  );
}
