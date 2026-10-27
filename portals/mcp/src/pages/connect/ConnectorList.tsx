import { Chip, List, ListItem, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import CopyButton from '../../components/CopyButton';
import { formatCount } from '../../lib/format';
import type { McpConnectorRow } from '../../lib/queries';

/**
 * Every connector URL, the gateway first (as the server lists it). The ones
 * this account can open copy with a click and say how many tools they offer;
 * the rest are shown, disabled, so it is clear what an extra console role adds.
 */
export default function ConnectorList({ connectors }: Readonly<{ connectors: readonly McpConnectorRow[] }>) {
  const { t, locale } = useTranslation();
  return (
    <List disablePadding aria-label={t('mcp.connect.connectorsTitle')}>
      {connectors.map((connector) => (
        <ListItem
          key={connector.key}
          divider
          disableGutters
          data-testid={`mcp-connector-${connector.key}`}
          secondaryAction={
            <CopyButton
              text={connector.url}
              label={t('mcp.connect.copyUrl', { vars: { label: connector.label } })}
              doneMessage={t('mcp.connect.urlCopied')}
              disabled={!connector.accessible}
            />
          }
        >
          <Stack spacing={0.5} sx={{ minWidth: 0, pr: 6 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography
                variant="subtitle2"
                component="span"
                sx={{ color: connector.accessible ? 'text.primary' : 'text.secondary' }}
              >
                {connector.label}
              </Typography>
              {connector.accessible ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={t('mcp.connect.toolCount', {
                    count: connector.tool_count,
                    vars: { number: formatCount(connector.tool_count, locale) },
                  })}
                />
              ) : (
                <Chip size="small" label={t('mcp.connect.noAccess')} />
              )}
            </Stack>
            <Typography variant="body2" component="code" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
              {connector.url}
            </Typography>
          </Stack>
        </ListItem>
      ))}
    </List>
  );
}
