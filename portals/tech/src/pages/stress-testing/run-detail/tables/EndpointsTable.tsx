import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import LiveRowsTable from '../../components/LiveRowsTable';
import SectionCard from '../../components/SectionCard';
import type { StressEndpoint } from '../../queries';
import { formatCount, formatMs, formatPct } from '../../labels';

const getRowId = (row: StressEndpoint) => row.key;
const searchOf = (row: StressEndpoint) => row.key;
const errorRate = (row: StressEndpoint) => (row.requests > 0 ? (row.errors / row.requests) * 100 : 0);

interface Props {
  endpoints: readonly StressEndpoint[];
}

/** Every page and query the bots called, slowest first — where a bottleneck names itself. */
export default function EndpointsTable({ endpoints }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<StressEndpoint>[]>(
    () => [
      { field: 'key', headerName: t('tech.stress.colEndpoint'), flex: 1, minWidth: 220, type: 'text', valueGetter: (row) => row.key },
      { field: 'requests', headerName: t('tech.stress.colRequests'), width: 110, type: 'number', valueGetter: (row) => formatCount(row.requests) },
      // Sorts and filters on the error count; the cell shows it as a rate.
      { field: 'errors', headerName: t('tech.stress.colErrors'), width: 100, type: 'number', valueGetter: (row) => formatPct(errorRate(row)) },
      { field: 'avg_ms', headerName: t('tech.stress.colAvg'), width: 100, type: 'number', valueGetter: (row) => formatMs(row.avg_ms) },
      { field: 'p50_ms', headerName: t('tech.stress.colP50'), width: 100, type: 'number', valueGetter: (row) => formatMs(row.p50_ms) },
      { field: 'p95_ms', headerName: t('tech.stress.colP95'), width: 100, type: 'number', valueGetter: (row) => formatMs(row.p95_ms) },
      { field: 'p99_ms', headerName: t('tech.stress.colP99'), width: 100, type: 'number', valueGetter: (row) => formatMs(row.p99_ms) },
    ],
    [t]
  );

  return (
    <SectionCard title={t('tech.stress.endpointsTitle')} subtitle={t('tech.stress.endpointsSubtitle')}>
      <LiveRowsTable
        tableId="tech-stress-endpoints"
        columns={columns}
        rows={endpoints}
        getRowId={getRowId}
        searchOf={searchOf}
        emptyText={t('tech.stress.endpointsEmpty')}
        searchPlaceholder={t('tech.stress.endpointsSearch')}
      />
    </SectionCard>
  );
}
