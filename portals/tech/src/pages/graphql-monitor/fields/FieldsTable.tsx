import { useMemo } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import LiveRowsTable from '../../stress-testing/components/LiveRowsTable';
import { formatCount, formatMs, formatPct } from '../../stress-testing/labels';
import { formatDateTime } from '../../server/format';
import OperationTypeChip from '../components/OperationTypeChip';
import { errorRateColor, fieldKindOptions } from '../labels';
import type { FieldUsage } from '../queries';

interface Props {
  fields: readonly FieldUsage[];
}

const getRowId = (row: FieldUsage) => row.coordinate;
const searchOf = (row: FieldUsage) => [row.coordinate, row.return_type, row.kind, row.description].join(' ');
const renderKind = (row: FieldUsage) => <OperationTypeChip type={row.kind} />;

interface FieldLabels {
  deprecated: string;
  unused: string;
}

function makeRenderField(labels: FieldLabels) {
  const render = (row: FieldUsage) => (
    <Box sx={{ minWidth: 0, py: 0.5, lineHeight: 1.3 }} data-testid={`graphql-monitor-field-${row.coordinate}`}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace', fontWeight: 600 }} title={row.description || row.coordinate}>
          {row.coordinate}
        </Typography>
        {row.deprecation_reason !== null && (
          <Chip size="small" color="warning" label={labels.deprecated} title={row.deprecation_reason} />
        )}
        {row.referenced === 0 && <Chip size="small" variant="outlined" label={labels.unused} />}
      </Stack>
      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }} title={row.arguments.join(', ')}>
        {row.arguments.length > 0 ? `(${row.arguments.join(', ')})` : ''}
      </Typography>
    </Box>
  );
  return render;
}

const renderErrorRate = (row: FieldUsage) => (
  <Typography variant="body2" component="span" sx={{ color: errorRateColor(row.error_rate_pct) }}>
    {formatPct(row.error_rate_pct)}
  </Typography>
);

/** Every field of the schema, called or not, with how much and how fast. */
export default function FieldsTable({ fields }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<FieldUsage>[]>(
    () => [
      {
        field: 'coordinate',
        headerName: t('tech.graphqlMonitor.colField'),
        flex: 1,
        minWidth: 280,
        type: 'text',
        cellRenderer: makeRenderField({ deprecated: t('tech.graphqlMonitor.deprecated'), unused: t('tech.graphqlMonitor.unused') }),
        valueGetter: (row) => row.coordinate,
      },
      { field: 'kind', headerName: t('tech.graphqlMonitor.colType'), width: 130, type: 'enum', options: fieldKindOptions(t), cellRenderer: renderKind, valueGetter: (row) => row.kind },
      { field: 'return_type', headerName: t('tech.graphqlMonitor.colReturns'), width: 200, type: 'text', valueGetter: (row) => row.return_type },
      { field: 'referenced', headerName: t('tech.graphqlMonitor.colReferenced'), width: 120, type: 'number', valueGetter: (row) => formatCount(row.referenced) },
      { field: 'avg_ms', headerName: t('tech.graphqlMonitor.colResolverAvg'), width: 120, type: 'number', valueGetter: (row) => formatMs(row.avg_ms) },
      { field: 'max_ms', headerName: t('tech.graphqlMonitor.colResolverMax'), width: 120, type: 'number', valueGetter: (row) => formatMs(row.max_ms) },
      { field: 'error_rate_pct', headerName: t('tech.graphqlMonitor.colErrorRate'), width: 110, type: 'number', cellRenderer: renderErrorRate, valueGetter: (row) => row.error_rate_pct },
      { field: 'sampled_calls', headerName: t('tech.graphqlMonitor.colSampledCalls'), width: 120, hide: true, type: 'number', valueGetter: (row) => formatCount(row.sampled_calls) },
      { field: 'last_seen_at', headerName: t('tech.graphqlMonitor.colLastSeen'), width: 170, type: 'date', valueGetter: (row) => formatDateTime(row.last_seen_at) },
    ],
    [t]
  );

  return (
    <LiveRowsTable
      tableId="tech-graphql-monitor-fields"
      columns={columns}
      rows={fields}
      getRowId={getRowId}
      searchOf={searchOf}
      emptyText={t('tech.graphqlMonitor.fieldsEmpty')}
      searchPlaceholder={t('tech.graphqlMonitor.fieldsSearch')}
      defaultSort={{ field: 'referenced', dir: 'desc' }}
    />
  );
}
