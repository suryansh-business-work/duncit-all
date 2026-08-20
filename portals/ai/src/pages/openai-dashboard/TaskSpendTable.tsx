import { useMemo } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { usd, tokens } from '../../lib/usd';
import type { TaskSpend } from './queries';
import { formatDateTime } from '@duncit/app-settings';

const getRowId = (row: TaskSpend) => row.task;
const searchOf = (row: TaskSpend) => `${row.label} ${row.module} ${row.task}`;

const renderTask = (row: TaskSpend) => (
  <Box>
    <Typography variant="body2" fontWeight={600} noWrap title={row.label}>
      {row.label}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
      {row.task}
    </Typography>
  </Box>
);

/**
 * A failure still costs money when the model answered and the answer was
 * unusable, and costs nothing when the key was missing — either way it is the
 * column that explains a task whose spend does not match its call count.
 */
const renderFailures = (row: TaskSpend) => {
  if (row.failures === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  return <Chip size="small" color="warning" variant="outlined" label={row.failures} />;
};

const renderCost = (row: TaskSpend) => (
  <Typography variant="body2" fontWeight={700}>
    {usd(row.cost_usd)}
  </Typography>
);

/** Per-task spend for the selected range — the answer to "which feature is the bill". */
export default function TaskSpendTable({ rows }: Readonly<{ rows: readonly TaskSpend[] }>) {
  const fetchRows = useMemo(() => clientTableFetch<TaskSpend>(rows, searchOf), [rows]);

  const columns = useMemo<DuncitColumn<TaskSpend>[]>(
    () => [
      {
        field: 'label',
        headerName: 'Task',
        flex: 1,
        minWidth: 230,
        cellRenderer: renderTask,
        valueGetter: (row) => row.label,
      },
      { field: 'module', headerName: 'Area', width: 140, valueGetter: (row) => row.module },
      {
        field: 'calls',
        headerName: 'Calls',
        width: 100,
        valueGetter: (row) => formatDateTime(row.calls),
      },
      {
        field: 'failures',
        headerName: 'Failed',
        width: 100,
        cellRenderer: renderFailures,
        valueGetter: (row) => row.failures,
      },
      {
        field: 'tokens',
        headerName: 'Tokens',
        width: 130,
        valueGetter: (row) => tokens(row.tokens),
      },
      {
        field: 'avg_duration_ms',
        headerName: 'Avg time',
        width: 110,
        valueGetter: (row) => `${row.avg_duration_ms} ms`,
      },
      {
        field: 'cost_usd',
        headerName: 'Cost',
        width: 130,
        cellRenderer: renderCost,
        valueGetter: (row) => row.cost_usd,
      },
    ],
    []
  );

  if (rows.length === 0) {
    return (
      <Stack sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No OpenAI calls in this range.
        </Typography>
      </Stack>
    );
  }

  return (
    <DuncitTable<TaskSpend>
      tableId="ai-openai-task-spend"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText="No OpenAI calls in this range."
      defaultSort={{ field: 'cost_usd', dir: 'desc' }}
      searchPlaceholder="Search task or area"
    />
  );
}
