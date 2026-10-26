import { EM_DASH, type DuncitColumn } from '@duncit/table';
import type { Translate } from '@duncit/shell';
import { StatusChip } from '@duncit/ui';
import { TOOL_RISK, vocabularyColors, vocabularyLabel, vocabularyOptions } from '../../lib/labels';
import type { ToolRow } from './queries';

const RISK_COLORS = vocabularyColors(TOOL_RISK);
const AVAILABLE_COLORS = { yes: 'success', no: 'default' } as const;

/** The Tools table: what each tool is, how risky, and whether you could use it. */
export function buildToolColumns(t: Translate): DuncitColumn<ToolRow>[] {
  const yesNo = (value: boolean) => (value ? t('shell.common.yes') : t('shell.common.no'));
  return [
    { field: 'name', headerName: t('mcp.tools.columnName'), type: 'text', flex: 1, minWidth: 240 },
    { field: 'title', headerName: t('mcp.tools.columnTitle'), type: 'text', flex: 1, minWidth: 220 },
    { field: 'category_label', headerName: t('mcp.tools.columnCategory'), type: 'text', width: 160 },
    {
      field: 'risk',
      headerName: t('mcp.tools.columnRisk'),
      type: 'enum',
      options: vocabularyOptions(TOOL_RISK, t),
      width: 130,
      valueGetter: (row) => vocabularyLabel(TOOL_RISK, row.risk, t),
      cellRenderer: (row) => (
        <StatusChip status={row.risk} colorMap={RISK_COLORS} label={vocabularyLabel(TOOL_RISK, row.risk, t)} variant="outlined" />
      ),
    },
    {
      field: 'needs_confirmation',
      headerName: t('mcp.tools.columnConfirm'),
      type: 'boolean',
      width: 150,
      valueGetter: (row) => yesNo(row.needs_confirmation),
    },
    {
      field: 'available',
      headerName: t('mcp.tools.columnAvailable'),
      type: 'boolean',
      width: 130,
      valueGetter: (row) => yesNo(row.available),
      cellRenderer: (row) => (
        <StatusChip status={row.available ? 'yes' : 'no'} colorMap={AVAILABLE_COLORS} label={yesNo(row.available)} />
      ),
    },
    {
      field: 'unavailable_reason',
      headerName: t('mcp.tools.columnReason'),
      type: 'text',
      flex: 1,
      minWidth: 220,
      valueGetter: (row) => row.unavailable_reason ?? EM_DASH,
    },
  ];
}
