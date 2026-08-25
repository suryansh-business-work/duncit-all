import { useMemo, type MutableRefObject } from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { usd, tokens } from '../../lib/usd';
import { STATUS_COLOR, STATUS_OPTIONS, type OpenAiLogRow } from './queries';

interface Props {
  fetchRows: TableFetch<OpenAiLogRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Opens the row's drawer — the prompt that went out and the answer that came back. */
  onRowClick: (row: OpenAiLogRow) => void;
  /** Task/area options from the server catalogue, as select filters. */
  taskOptions: ReadonlyArray<{ value: string; label: string }>;
  moduleOptions: ReadonlyArray<{ value: string; label: string }>;
}

const getRowId = (row: OpenAiLogRow) => row.id;

const renderStatus = (row: OpenAiLogRow) => (
  <Chip size="small" label={row.status} color={STATUS_COLOR[row.status] ?? 'default'} />
);

const renderTask = (row: OpenAiLogRow) => (
  <Box>
    <Typography variant="body2" noWrap title={row.task_label}>
      {row.task_label || row.task}
    </Typography>
    <Typography variant="caption" noWrap title={row.detail} sx={{
      color: "text.secondary"
    }}>
      {row.detail || row.module}
    </Typography>
  </Box>
);

/**
 * An unpriced row shows its cost struck through with a note, rather than a
 * confident "$0" — the tokens were spent, the rate card just cannot say what
 * they were worth.
 */
type Translate = ReturnType<typeof useTranslation>['t'];

const makeRenderCost = (t: Translate) => (row: OpenAiLogRow) => {
  if (!row.priced && row.total_tokens > 0) {
    return (
      <Tooltip title={t('ai.openAiLogs.unpricedTooltip')}>
        <Typography variant="body2" sx={{
          color: "warning.main"
        }}>
          {t('ai.openAiLogs.unpriced')}
        </Typography>
      </Tooltip>
    );
  }
  return <Typography variant="body2">{usd(row.cost_usd)}</Typography>;
};

const renderTokens = (row: OpenAiLogRow) => (
  <Box>
    <Typography variant="body2">{tokens(row.total_tokens)}</Typography>
    <Typography variant="caption" sx={{
      color: "text.secondary"
    }}>
      {row.prompt_tokens} in · {row.completion_tokens} out
    </Typography>
  </Box>
);

/** Blank on a success and the whole answer on anything else — give it room. */
const renderError = (row: OpenAiLogRow) => {
  if (!row.error_message) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>—
              </Typography>
    );
  }
  return (
    <Tooltip title={row.error_message}>
      <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
        {row.error_message}
      </Typography>
    </Tooltip>
  );
};

export default function OpenAiLogsTable({
  fetchRows,
  refetchRef,
  onRowClick,
  taskOptions,
  moduleOptions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const renderCost = useMemo(() => makeRenderCost(t), [t]);
  const columns = useMemo<DuncitColumn<OpenAiLogRow>[]>(
    () => [
      dateColumn<OpenAiLogRow>({
        field: 'created_at',
        headerName: t('ai.openAiLogs.colWhen'),
        width: 165,
      }),
      {
        field: 'status',
        headerName: t('ai.openAiLogs.colStatus'),
        width: 110,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'task',
        headerName: t('ai.openAiLogs.colTask'),
        flex: 1,
        minWidth: 230,
        filter: { type: 'select', options: taskOptions },
        cellRenderer: renderTask,
        valueGetter: (row) => row.task_label || row.task,
      },
      {
        field: 'module',
        headerName: t('ai.openAiLogs.colArea'),
        width: 130,
        filter: { type: 'select', options: moduleOptions },
        valueGetter: (row) => row.module || '—',
      },
      {
        field: 'model',
        headerName: t('ai.openAiLogs.colModel'),
        width: 140,
        filter: { type: 'text' },
        valueGetter: (row) => row.model || '—',
      },
      {
        field: 'total_tokens',
        headerName: t('ai.openAiLogs.colTokens'),
        width: 130,
        filter: { type: 'number' },
        cellRenderer: renderTokens,
        valueGetter: (row) => row.total_tokens,
      },
      {
        field: 'cost_usd',
        headerName: t('ai.openAiLogs.colCost'),
        width: 110,
        filter: { type: 'number' },
        cellRenderer: renderCost,
        valueGetter: (row) => row.cost_usd,
      },
      {
        field: 'duration_ms',
        headerName: t('ai.openAiLogs.colTook'),
        width: 95,
        filter: { type: 'number' },
        valueGetter: (row) => `${row.duration_ms} ms`,
      },
      {
        field: 'error_message',
        headerName: t('ai.openAiLogs.colReason'),
        sortable: false,
        minWidth: 220,
        cellRenderer: renderError,
        valueGetter: (row) => row.error_message || '—',
      },
    ],
    [taskOptions, moduleOptions, renderCost, t]
  );

  return (
    <DuncitTable<OpenAiLogRow>
      tableId="ai-openai-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('ai.openAiLogs.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('ai.openAiLogs.search')}
      refetchRef={refetchRef}
      onRowClick={onRowClick}
    />
  );
}
