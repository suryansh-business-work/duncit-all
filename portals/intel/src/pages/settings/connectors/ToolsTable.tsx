import { useMemo } from 'react';
import { Chip, MenuItem, TextField, Tooltip, Typography } from '@mui/material';
import type { IntelConnector, IntelTool } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';

const CLASS_COLOR: Record<string, 'success' | 'warning' | 'error'> = { READ: 'success', WRITE: 'warning', DESTRUCTIVE: 'error' };
const CLASS_KEYS: Record<string, string> = { READ: 'intel.settings.connectors.class.READ', WRITE: 'intel.settings.connectors.class.WRITE', DESTRUCTIVE: 'intel.settings.connectors.class.DESTRUCTIVE' };
const searchOf = (tool: IntelTool) => `${tool.name} ${tool.description} ${tool.effective}`;

/**
 * An MCP server's tools with their class. READ runs at once; WRITE and
 * DESTRUCTIVE always go through approval. An admin may reclassify a tool
 * (e.g. mark a misleadingly-named tool DESTRUCTIVE).
 */
export default function ToolsTable({ connector, onClass }: Readonly<{ connector: IntelConnector; onClass: (tool: string, cls: string | null) => void }>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<IntelTool>[]>(
    () => [
      {
        field: 'name',
        headerName: t('intel.settings.connectors.toolName'),
        flex: 1,
        minWidth: 220,
        type: 'text',
        valueGetter: (r) => r.name,
        cellRenderer: (r) => (
          <Tooltip title={r.description}>
            <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace' }}>{r.name}</Typography>
          </Tooltip>
        ),
      },
      { field: 'class', headerName: t('intel.settings.connectors.detected'), width: 130, type: 'text', valueGetter: (r) => r.class, cellRenderer: (r) => <Chip size="small" variant="outlined" color={CLASS_COLOR[r.class] ?? 'warning'} label={t(CLASS_KEYS[r.class] ?? 'intel.settings.connectors.class.WRITE')} /> },
      {
        field: 'override',
        headerName: t('intel.settings.connectors.override'),
        width: 190,
        type: 'actions',
        cellRenderer: (r) => (
          <TextField select size="small" value={r.override ?? ''} onChange={(e) => onClass(r.name, e.target.value || null)} slotProps={{ htmlInput: { 'aria-label': t('intel.settings.connectors.overrideFor', { vars: { tool: r.name } }) } }} sx={{ minWidth: 160 }}>
            <MenuItem value="">{t('intel.settings.connectors.auto')}</MenuItem>
            {['READ', 'WRITE', 'DESTRUCTIVE'].map((c) => (
              <MenuItem key={c} value={c}>{t(CLASS_KEYS[c] ?? 'intel.settings.connectors.class.WRITE')}</MenuItem>
            ))}
          </TextField>
        ),
      },
    ],
    [t, onClass]
  );
  const fetchRows = useMemo(() => clientTableFetch<IntelTool>(connector.tools, searchOf, columns), [connector.tools, columns]);
  return <DuncitTable<IntelTool> ariaLabel={t('intel.settings.connectors.tools')} tableId={`intel-mcp-tools-${connector.id}`} columns={columns} fetchRows={fetchRows} getRowId={(r) => r.name} emptyText={t('intel.settings.connectors.noTools')} searchPlaceholder={t('intel.settings.connectors.searchTools')} defaultPageSize={10} />;
}
