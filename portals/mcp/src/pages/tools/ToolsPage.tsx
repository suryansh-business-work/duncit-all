import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import { DuncitTable, type TableFilterValue } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import { GATEWAY_KEY, MCP_CONNECTORS, type McpConnectorsData } from '../../lib/queries';
import { useClientRows } from '../../lib/useClientRows';
import { MCP_TOOLS_CATALOG, type ToolRow, type ToolsCatalogData } from './queries';
import { buildToolColumns } from './toolColumns';
import ToolDrawer from './ToolDrawer';
import ToolsFilters from './ToolsFilters';

const getRowId = (row: ToolRow) => row.name;
const NO_FILTERS: TableFilterValue[] = [];
const NO_TOOLS: ToolRow[] = [];

/**
 * Tools: every MCP tool a connector offers, with its risk and whether you could
 * use it on a read & write connection (and why not). The connector narrows on
 * the server; category and search narrow the rows already here.
 */
export default function ToolsPage() {
  const { t } = useTranslation();
  const [connector, setConnector] = useState(GATEWAY_KEY);
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState<ToolRow | null>(null);
  const connectors = useQuery<McpConnectorsData>(MCP_CONNECTORS);
  const catalog = useQuery<ToolsCatalogData, { endpoint: string }>(MCP_TOOLS_CATALOG, {
    variables: { endpoint: connector },
  });
  const data = catalog.data?.mcpCatalog;
  const columns = useMemo(() => buildToolColumns(t), [t]);
  const searchOf = useCallback((row: ToolRow) => `${row.name} ${row.title} ${row.category_label}`, []);
  const { fetchRows, refetchRef } = useClientRows(data?.tools ?? NO_TOOLS, searchOf, columns);
  const filters = useMemo<TableFilterValue[]>(
    () => (category ? [{ field: 'category', op: 'eq', value: category }] : NO_FILTERS),
    [category],
  );
  const changeConnector = (key: string) => {
    setConnector(key);
    setCategory('');
  };

  return (
    <Stack spacing={3}>
      <PageHeader title={t('mcp.tools.title')} subtitle={t('mcp.tools.subtitle')} />
      <ToolsFilters
        connectors={connectors.data?.mcpConnectors ?? []}
        connector={connector}
        onConnector={changeConnector}
        total={data?.total ?? 0}
        categories={data?.categories ?? []}
        category={category}
        onCategory={setCategory}
      />
      {catalog.error && !data ? <Alert severity="error">{t('mcp.common.loadFailed')}</Alert> : null}
      {catalog.loading && !data ? <Skeleton variant="rounded" height={320} /> : null}
      {data ? (
        <DuncitTable<ToolRow>
          tableId="mcp-tools"
          ariaLabel={t('mcp.tools.title')}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getRowId}
          refetchRef={refetchRef}
          externalFilters={filters}
          onRowClick={setOpen}
          defaultSort={{ field: 'name', dir: 'asc' }}
          searchPlaceholder={t('mcp.tools.search')}
          emptyText={t('mcp.tools.empty')}
        />
      ) : null}
      <ToolDrawer tool={open} onClose={() => setOpen(null)} />
    </Stack>
  );
}
