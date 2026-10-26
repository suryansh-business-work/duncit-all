import { useCallback, useMemo, useRef } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { MCP_CONNECTORS, type McpConnectorsData } from '../../lib/queries';
import { useIsMcpManager } from '../../lib/roles';
import { buildConnectionColumns } from './connectionColumns';
import { MCP_CONNECTIONS_TABLE, REVOKE_MCP_CONNECTION, type ConnectionRow } from './queries';

const getRowId = (row: ConnectionRow) => row.id;
/** A token's resource and a connector's URL may differ by a trailing slash. */
const comparable = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);

/**
 * Connections: every AI app approved on the consent screen — your own, or
 * everyone's for a manager — with what it may do, which connector it holds and
 * when it was last used. Revoking one ends it at the app's next call.
 */
export default function ConnectionsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const manager = useIsMcpManager();
  const confirm = useConfirm();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [revoke] = useMutation(REVOKE_MCP_CONNECTION);
  const { data: connectorData } = useQuery<McpConnectorsData>(MCP_CONNECTORS);
  const fetchRows = useApolloTableFetch<ConnectionRow>(client, MCP_CONNECTIONS_TABLE, 'mcpConnectionsTable');

  const connectorLabel = useCallback(
    (resource: string) =>
      connectorData?.mcpConnectors.find((connector) => comparable(connector.url) === comparable(resource))?.label ?? resource,
    [connectorData],
  );

  const columns = useMemo(() => {
    const onRevoke = async (row: ConnectionRow) => {
      const ok = await confirm({
        title: t('mcp.connections.revokeTitle'),
        message: t('mcp.connections.revokeBody', { vars: { app: row.client_name } }),
        confirmLabel: t('mcp.connections.revoke'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await revoke({ variables: { id: row.id } });
        notifySuccess(t('mcp.connections.revoked'));
        refetchRef.current?.();
      } catch (error) {
        notifyError(parseApiError(error, t('mcp.connections.revokeFailed')));
      }
    };
    return buildConnectionColumns({ t, formatDateTime, manager, connectorLabel, onRevoke });
  }, [t, formatDateTime, manager, connectorLabel, confirm, revoke]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('mcp.connections.title')}
        subtitle={manager ? t('mcp.connections.subtitleAll') : t('mcp.connections.subtitleMine')}
      />
      <DuncitTable<ConnectionRow>
        tableId="mcp-connections"
        ariaLabel={t('mcp.connections.title')}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        refetchRef={refetchRef}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('mcp.connections.search')}
        emptyText={t('mcp.connections.empty')}
      />
    </Stack>
  );
}
