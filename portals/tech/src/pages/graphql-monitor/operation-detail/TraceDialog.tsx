import { useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import MetricTiles from '../../stress-testing/components/MetricTiles';
import { formatMs } from '../../stress-testing/labels';
import { formatDateTime } from '../../server/format';
import TraceWaterfall from './TraceWaterfall';
import { GRAPHQL_MONITOR_TRACE, type MonitorTrace } from '../queries';

interface Props {
  traceId: string | null;
  onClose: () => void;
}

/** One sampled request: its phases, its errors, and every resolver on a timeline. */
export default function TraceDialog({ traceId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ graphqlMonitorTrace: MonitorTrace }>(GRAPHQL_MONITOR_TRACE, {
    variables: { id: traceId },
    skip: !traceId,
  });
  const trace = data?.graphqlMonitorTrace;

  return (
    <Dialog open={Boolean(traceId)} onClose={onClose} fullWidth maxWidth="lg" data-testid="graphql-monitor-trace-dialog">
      <DialogTitle>
        {t('tech.graphqlMonitor.traceTitle', { vars: { at: formatDateTime(trace?.at) } })}
      </DialogTitle>
      <DialogContent dividers>
        <QueryGuard loading={loading && !trace} error={error} errorText={error?.message}>
          {trace && (
            <Stack spacing={2}>
              <MetricTiles
                minWidth={140}
                tiles={[
                  { id: 'total', label: t('tech.graphqlMonitor.traceTotal'), value: formatMs(trace.duration_ms) },
                  { id: 'parse', label: t('tech.graphqlMonitor.phaseParse'), value: formatMs(trace.parse_ms) },
                  { id: 'validate', label: t('tech.graphqlMonitor.phaseValidate'), value: formatMs(trace.validate_ms) },
                  { id: 'execute', label: t('tech.graphqlMonitor.phaseExecute'), value: formatMs(trace.execute_ms) },
                  { id: 'client', label: t('tech.graphqlMonitor.traceClient'), value: trace.client || '—' },
                ]}
              />
              {[...new Set(trace.error_messages)].map((message) => (
                <Alert key={message} severity="error">
                  {message}
                </Alert>
              ))}
              <TraceWaterfall
                resolvers={trace.resolvers ?? []}
                durationMs={trace.duration_ms}
                resolverCount={trace.resolver_count}
              />
            </Stack>
          )}
        </QueryGuard>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} data-testid="graphql-monitor-trace-close">
          {t('shell.common.close')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
