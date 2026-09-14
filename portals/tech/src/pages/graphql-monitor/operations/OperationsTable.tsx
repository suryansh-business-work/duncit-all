import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import LiveRowsTable from '../../stress-testing/components/LiveRowsTable';
import { formatCount, formatMs, formatPct } from '../../stress-testing/labels';
import { formatDateTime } from '../../server/format';
import OperationTypeChip from '../components/OperationTypeChip';
import { errorRateColor, latencyColor } from '../labels';
import type { OperationSummary } from '../queries';

interface Props {
  operations: readonly OperationSummary[];
  slowMs: number | null;
  onOpen: (operation: OperationSummary) => void;
}

const getRowId = (row: OperationSummary) => row.id;
const searchOf = (row: OperationSummary) => [row.name, row.type, ...row.root_fields].join(' ');
const renderType = (row: OperationSummary) => <OperationTypeChip type={row.type} />;

const renderName = (row: OperationSummary) => (
  <Box sx={{ minWidth: 0, lineHeight: 1.3, py: 0.5 }} data-testid={`graphql-monitor-operation-${row.id}`}>
    <Typography variant="body2" noWrap title={row.name} sx={{ fontWeight: 600 }}>
      {row.name}
    </Typography>
    <Typography variant="caption" noWrap title={row.root_fields.join(', ')} sx={{ color: 'text.secondary', display: 'block' }}>
      {row.root_fields.join(', ')}
    </Typography>
  </Box>
);

function makeRenderMs(pick: (row: OperationSummary) => number, slowMs: number | null) {
  const render = (row: OperationSummary) => {
    const ms = pick(row);
    const color = slowMs === null ? undefined : latencyColor(ms, slowMs);
    return (
      <Typography variant="body2" component="span" sx={{ color }}>
        {formatMs(ms)}
      </Typography>
    );
  };
  return render;
}

const renderErrorRate = (row: OperationSummary) => (
  <Typography variant="body2" component="span" sx={{ color: errorRateColor(row.error_rate_pct) }}>
    {formatPct(row.error_rate_pct)}
  </Typography>
);

/** Every operation seen in the range. Sortable by any number; the row opens the operation. */
export default function OperationsTable({ operations, slowMs, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<OperationSummary>[]>(
    () => [
      { field: 'name', headerName: t('tech.graphqlMonitor.colOperation'), flex: 1, minWidth: 240, cellRenderer: renderName, valueGetter: (row) => row.name },
      { field: 'type', headerName: t('tech.graphqlMonitor.colType'), width: 130, cellRenderer: renderType, valueGetter: (row) => row.type },
      { field: 'requests', headerName: t('tech.graphqlMonitor.colRequests'), width: 110, valueGetter: (row) => formatCount(row.requests) },
      { field: 'rpm', headerName: t('tech.graphqlMonitor.colRpm'), width: 100, valueGetter: (row) => row.rpm },
      { field: 'error_rate_pct', headerName: t('tech.graphqlMonitor.colErrorRate'), width: 110, cellRenderer: renderErrorRate, valueGetter: (row) => row.error_rate_pct },
      { field: 'p50_ms', headerName: t('tech.graphqlMonitor.colP50'), width: 100, valueGetter: (row) => formatMs(row.p50_ms) },
      { field: 'p95_ms', headerName: t('tech.graphqlMonitor.colP95'), width: 100, cellRenderer: makeRenderMs((row) => row.p95_ms, slowMs), valueGetter: (row) => row.p95_ms },
      { field: 'p99_ms', headerName: t('tech.graphqlMonitor.colP99'), width: 100, valueGetter: (row) => formatMs(row.p99_ms) },
      { field: 'avg_ms', headerName: t('tech.graphqlMonitor.colAvg'), width: 100, valueGetter: (row) => formatMs(row.avg_ms) },
      { field: 'execute_avg_ms', headerName: t('tech.graphqlMonitor.colExecute'), width: 110, hide: true, valueGetter: (row) => formatMs(row.execute_avg_ms) },
      { field: 'cached', headerName: t('tech.graphqlMonitor.colCached'), width: 100, hide: true, valueGetter: (row) => formatCount(row.cached) },
      { field: 'last_seen_at', headerName: t('tech.graphqlMonitor.colLastSeen'), width: 170, valueGetter: (row) => formatDateTime(row.last_seen_at) },
    ],
    [slowMs, t]
  );

  return (
    <LiveRowsTable
      tableId="tech-graphql-monitor-operations"
      columns={columns}
      rows={operations}
      getRowId={getRowId}
      searchOf={searchOf}
      emptyText={t('tech.graphqlMonitor.operationsEmpty')}
      searchPlaceholder={t('tech.graphqlMonitor.operationsSearch')}
      onRowClick={onOpen}
      defaultSort={{ field: 'requests', dir: 'desc' }}
    />
  );
}
