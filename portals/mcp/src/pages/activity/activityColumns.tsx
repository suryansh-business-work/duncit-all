import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { Translate } from '@duncit/shell';
import { StatusChip } from '@duncit/ui';
import { formatCost, formatCount } from '../../lib/format';
import { CALL_STATUS, TOOL_RISK, vocabularyColors, vocabularyLabel, vocabularyOptions } from '../../lib/labels';
import type { ToolCallRow } from './queries';

interface ActivityColumnOptions {
  t: Translate;
  locale: string;
  formatDateTime: (date: Date) => string;
  /** Managers see everyone's calls, so they get a Person column. */
  manager: boolean;
}

const STATUS_COLORS = vocabularyColors(CALL_STATUS);
const RISK_COLORS = vocabularyColors(TOOL_RISK);

/**
 * Every tool call as the Activity table lists it. Sort and filter flags follow
 * what the server's table config answers (usage.service TOOL_CALL_TABLE): a
 * column it cannot order or match on says so instead of failing.
 */
export function buildActivityColumns({ t, locale, formatDateTime, manager }: ActivityColumnOptions): DuncitColumn<ToolCallRow>[] {
  const count = (value: number) => formatCount(value, locale);
  const person: DuncitColumn<ToolCallRow>[] = manager
    ? [
        {
          field: 'user_email',
          headerName: t('mcp.activity.columnPerson'),
          type: 'text',
          minWidth: 200,
          valueGetter: (row) => row.user_email ?? t('mcp.common.unknown'),
        },
      ]
    : [];
  return [
    dateColumn<ToolCallRow>({
      field: 'created_at',
      headerName: t('mcp.activity.columnTime'),
      hide: false,
      width: 180,
      formatDate: formatDateTime,
    }),
    ...person,
    { field: 'client_name', headerName: t('mcp.activity.columnClient'), type: 'text', minWidth: 140 },
    { field: 'endpoint', headerName: t('mcp.activity.columnEndpoint'), type: 'text', width: 130, sortable: false },
    { field: 'tool', headerName: t('mcp.activity.columnTool'), type: 'text', flex: 1, minWidth: 220 },
    { field: 'category', headerName: t('mcp.activity.columnCategory'), type: 'text', width: 130, sortable: false },
    {
      field: 'risk',
      headerName: t('mcp.activity.columnRisk'),
      type: 'enum',
      options: vocabularyOptions(TOOL_RISK, t),
      width: 130,
      sortable: false,
      valueGetter: (row) => vocabularyLabel(TOOL_RISK, row.risk, t),
      cellRenderer: (row) => (
        <StatusChip status={row.risk} colorMap={RISK_COLORS} label={vocabularyLabel(TOOL_RISK, row.risk, t)} variant="outlined" />
      ),
    },
    {
      field: 'status',
      headerName: t('mcp.activity.columnStatus'),
      type: 'enum',
      options: vocabularyOptions(CALL_STATUS, t),
      width: 130,
      valueGetter: (row) => vocabularyLabel(CALL_STATUS, row.status, t),
      cellRenderer: (row) => (
        <StatusChip status={row.status} colorMap={STATUS_COLORS} label={vocabularyLabel(CALL_STATUS, row.status, t)} />
      ),
    },
    {
      field: 'reason',
      headerName: t('mcp.activity.columnReason'),
      type: 'text',
      flex: 1,
      minWidth: 220,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.reason ?? EM_DASH,
    },
    {
      field: 'duration_ms',
      headerName: t('mcp.activity.columnDuration'),
      type: 'number',
      width: 120,
      valueGetter: (row) => t('mcp.common.milliseconds', { vars: { ms: count(row.duration_ms) } }),
    },
    {
      field: 'input_tokens',
      headerName: t('mcp.activity.columnTokensIn'),
      type: 'number',
      width: 120,
      filterable: false,
      valueGetter: (row) => count(row.input_tokens),
    },
    {
      field: 'output_tokens',
      headerName: t('mcp.activity.columnTokensOut'),
      type: 'number',
      width: 120,
      filterable: false,
      valueGetter: (row) => count(row.output_tokens),
    },
    {
      field: 'cost',
      headerName: t('mcp.activity.columnCost'),
      type: 'number',
      width: 120,
      filterable: false,
      valueGetter: (row) => formatCost(row.cost, row.currency, locale),
    },
  ];
}
