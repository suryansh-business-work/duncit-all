import { useMemo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import LiveRowsTable from '../../stress-testing/components/LiveRowsTable';
import { formatCount } from '../../stress-testing/labels';
import { formatDateTime } from '../../server/format';
import type { ErrorGroup } from '../queries';

interface Props {
  errors: readonly ErrorGroup[];
  onOpenOperation: (error: ErrorGroup) => void;
}

const getRowId = (row: ErrorGroup) => row.id;
const searchOf = (row: ErrorGroup) => [row.message, row.code, row.path, row.operation_name].join(' ');

const renderCode = (row: ErrorGroup) => (
  <Chip size="small" color="error" variant="outlined" label={row.code || '—'} sx={{ fontFamily: 'monospace' }} />
);

const renderMessage = (row: ErrorGroup) => (
  <Box sx={{ minWidth: 0, py: 0.5, lineHeight: 1.3 }} data-testid={`graphql-monitor-error-${row.id}`}>
    <Typography variant="body2" noWrap title={row.message} sx={{ fontWeight: 600 }}>
      {row.message}
    </Typography>
    <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block', fontFamily: 'monospace' }}>
      {row.path || '—'}
    </Typography>
  </Box>
);

/** Every distinct failure in the range, most frequent first. The row opens the operation that failed. */
export default function ErrorsTable({ errors, onOpenOperation }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<ErrorGroup>[]>(
    () => [
      { field: 'message', headerName: t('tech.graphqlMonitor.colMessage'), flex: 1, minWidth: 280, type: 'text', cellRenderer: renderMessage, valueGetter: (row) => row.message },
      { field: 'code', headerName: t('tech.graphqlMonitor.colCode'), width: 190, type: 'text', cellRenderer: renderCode, valueGetter: (row) => row.code },
      { field: 'operation_name', headerName: t('tech.graphqlMonitor.colOperation'), width: 220, type: 'text', valueGetter: (row) => row.operation_name },
      { field: 'count', headerName: t('tech.graphqlMonitor.colCount'), width: 100, type: 'number', valueGetter: (row) => formatCount(row.count) },
      { field: 'first_seen_at', headerName: t('tech.graphqlMonitor.colFirstSeen'), width: 170, type: 'date', valueGetter: (row) => formatDateTime(row.first_seen_at) },
      { field: 'last_seen_at', headerName: t('tech.graphqlMonitor.colLastSeen'), width: 170, type: 'date', valueGetter: (row) => formatDateTime(row.last_seen_at) },
    ],
    [t]
  );

  return (
    <LiveRowsTable
      tableId="tech-graphql-monitor-errors"
      columns={columns}
      rows={errors}
      getRowId={getRowId}
      searchOf={searchOf}
      emptyText={t('tech.graphqlMonitor.errorsEmpty')}
      searchPlaceholder={t('tech.graphqlMonitor.errorsSearch')}
      onRowClick={onOpenOperation}
      defaultSort={{ field: 'count', dir: 'desc' }}
    />
  );
}
