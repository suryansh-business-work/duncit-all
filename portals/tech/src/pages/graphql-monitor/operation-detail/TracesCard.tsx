import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import LiveRowsTable from '../../stress-testing/components/LiveRowsTable';
import SectionCard from '../../stress-testing/components/SectionCard';
import { formatMs } from '../../stress-testing/labels';
import { formatDateTime } from '../../server/format';
import TraceDialog from './TraceDialog';
import { MONITOR_POLL_MS } from '../hooks';
import { GRAPHQL_MONITOR_TRACES, type MonitorTrace } from '../queries';

interface Props {
  operationId: string;
}

const EMPTY: MonitorTrace[] = [];
const getRowId = (row: MonitorTrace) => row.id;
const searchOf = (row: MonitorTrace) => [row.client, ...row.error_messages].join(' ');

/** The slowest sampled request of each hour, slowest first. A row opens its resolver timeline. */
export default function TracesCard({ operationId }: Readonly<Props>) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data } = useQuery<{ graphqlMonitorTraces: MonitorTrace[] }>(GRAPHQL_MONITOR_TRACES, {
    variables: { operation_id: operationId },
    fetchPolicy: 'cache-and-network',
    pollInterval: MONITOR_POLL_MS,
  });
  const columns = useMemo<DuncitColumn<MonitorTrace>[]>(
    () => [
      { field: 'at', headerName: t('tech.graphqlMonitor.colWhen'), width: 170, valueGetter: (row) => formatDateTime(row.at) },
      { field: 'duration_ms', headerName: t('tech.graphqlMonitor.colDuration'), width: 110, valueGetter: (row) => formatMs(row.duration_ms) },
      { field: 'execute_ms', headerName: t('tech.graphqlMonitor.phaseExecute'), width: 110, valueGetter: (row) => formatMs(row.execute_ms) },
      { field: 'resolver_count', headerName: t('tech.graphqlMonitor.colResolvers'), width: 110, valueGetter: (row) => row.resolver_count },
      { field: 'client', headerName: t('tech.graphqlMonitor.traceClient'), width: 160, valueGetter: (row) => row.client || '—' },
      {
        field: 'error_messages',
        headerName: t('tech.graphqlMonitor.colErrors'),
        flex: 1,
        minWidth: 200,
        sortable: false,
        valueGetter: (row) => row.error_messages.join(' · ') || '—',
      },
    ],
    [t]
  );

  return (
    <SectionCard title={t('tech.graphqlMonitor.tracesTitle')} subtitle={t('tech.graphqlMonitor.tracesSubtitle')}>
      <LiveRowsTable
        tableId="tech-graphql-monitor-traces"
        columns={columns}
        rows={data?.graphqlMonitorTraces ?? EMPTY}
        getRowId={getRowId}
        searchOf={searchOf}
        emptyText={t('tech.graphqlMonitor.tracesEmpty')}
        searchPlaceholder={t('tech.graphqlMonitor.tracesSearch')}
        onRowClick={(row) => setOpenId(row.id)}
        defaultSort={{ field: 'duration_ms', dir: 'desc' }}
      />
      <TraceDialog traceId={openId} onClose={() => setOpenId(null)} />
    </SectionCard>
  );
}
