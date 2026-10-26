import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PageHeader, SectionCard } from '@duncit/ui';
import ClientGuides from '../../components/client-guides/ClientGuides';
import { GATEWAY_KEY, MCP_CONNECTORS, type McpConnectorsData } from '../../lib/queries';
import ConnectorList from './ConnectorList';

/**
 * Connect without a pending request: the connector URLs this account can use
 * (from the server, never typed in here) and how to add one to each AI app.
 */
export default function ConnectorsPanel() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<McpConnectorsData>(MCP_CONNECTORS);
  const connectors = data?.mcpConnectors ?? [];
  const gateway = connectors.find((connector) => connector.key === GATEWAY_KEY);

  return (
    <Stack spacing={3}>
      <PageHeader title={t('mcp.connect.title')} subtitle={t('mcp.connect.subtitle')} />
      {error && !data ? <Alert severity="error">{t('mcp.common.loadFailed')}</Alert> : null}
      {loading && !data ? <Skeleton variant="rounded" height={240} /> : null}
      {data ? (
        <>
          <SectionCard title={t('mcp.connect.connectorsTitle')} subtitle={t('mcp.connect.connectorsHint')}>
            <ConnectorList connectors={connectors} />
          </SectionCard>
          {gateway ? (
            <SectionCard title={t('mcp.connect.clientsTitle')} subtitle={t('mcp.connect.clientsHint')}>
              <ClientGuides url={gateway.url} />
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
