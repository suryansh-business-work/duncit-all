import { useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import { useIsMcpManager } from '../../lib/roles';
import { buildActivityColumns } from './activityColumns';
import { MCP_TOOL_CALLS_TABLE, type ToolCallRow } from './queries';
import ToolCallDrawer from './ToolCallDrawer';

const getRowId = (row: ToolCallRow) => row.id;

/**
 * Activity: every MCP tool call, newest first — who, from which AI app, which
 * tool, why, how it went, how long it took and what it cost. Paging, sorting,
 * search and filters all run on the server, which also decides whose calls
 * are listed (everyone's for a manager, your own otherwise).
 */
export default function ActivityPage() {
  const { t, locale } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const manager = useIsMcpManager();
  const client = useApolloClient();
  const [open, setOpen] = useState<ToolCallRow | null>(null);
  const fetchRows = useApolloTableFetch<ToolCallRow>(client, MCP_TOOL_CALLS_TABLE, 'mcpToolCallsTable');
  const columns = useMemo(
    () => buildActivityColumns({ t, locale, formatDateTime, manager }),
    [t, locale, formatDateTime, manager],
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('mcp.activity.title')}
        subtitle={manager ? t('mcp.activity.subtitleAll') : t('mcp.activity.subtitleMine')}
      />
      <DuncitTable<ToolCallRow>
        tableId="mcp-activity"
        ariaLabel={t('mcp.activity.title')}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={setOpen}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('mcp.activity.search')}
        emptyText={t('mcp.activity.empty')}
      />
      <ToolCallDrawer row={open} onClose={() => setOpen(null)} />
    </Stack>
  );
}
