import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import MonitorHeader from '../components/MonitorHeader';
import ErrorsTable from './ErrorsTable';
import { MONITOR_POLL_MS, useMonitorRange } from '../hooks';
import { GRAPHQL_MONITOR_ERRORS, type ErrorGroup } from '../queries';

const EMPTY: ErrorGroup[] = [];

/**
 * Tech > GraphQL Monitor > Errors — what the API answered with instead of
 * data, grouped so a fault that hit ten thousand requests is one row: same
 * operation, same code, same path, same message once ids and numbers are
 * set aside.
 */
export default function GraphqlErrorsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [range, setRange] = useMonitorRange();
  const { data, loading, error } = useQuery<{ graphqlMonitorErrors: ErrorGroup[] }>(GRAPHQL_MONITOR_ERRORS, {
    variables: { range },
    fetchPolicy: 'cache-and-network',
    pollInterval: MONITOR_POLL_MS,
  });

  const openOperation = useCallback(
    (row: ErrorGroup) => navigate(`/graphql-monitor/operations/${row.operation_id}?range=${range}`),
    [navigate, range]
  );

  return (
    <Stack spacing={2.5} data-testid="graphql-monitor-errors-page">
      <MonitorHeader
        title={t('tech.graphqlMonitor.errorsTitle')}
        subtitle={t('tech.graphqlMonitor.errorsSubtitle')}
        range={range}
        onRangeChange={setRange}
        testId="graphql-monitor-errors"
      />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        <ErrorsTable errors={data?.graphqlMonitorErrors ?? EMPTY} onOpenOperation={openOperation} />
      </QueryGuard>
    </Stack>
  );
}
