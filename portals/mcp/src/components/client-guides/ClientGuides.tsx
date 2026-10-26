import { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import CodeBlock from '../CodeBlock';
import { CLIENT_GUIDES, type ClientKey } from './clients';

const ID_PREFIX = 'mcp-client';

/**
 * Step-by-step setup for each AI app, one tab per app (the choice rides in the
 * URL as `?selectedtab=`). `url` is the connector to paste — the gateway, normally.
 */
export default function ClientGuides({ url }: Readonly<{ url: string }>) {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<ClientKey>[]>(
    () => CLIENT_GUIDES.map((guide) => ({ value: guide.key, label: t(guide.nameKey) })),
    [t],
  );
  const tabs = useTabParam<ClientKey>({ items, fallback: 'claude' });
  const guide = CLIENT_GUIDES.find((entry) => entry.key === tabs.value) ?? CLIENT_GUIDES[0];

  return (
    <Stack spacing={2}>
      <DuncitTabs
        {...tabs}
        idPrefix={ID_PREFIX}
        aria-label={t('mcp.clients.tabsLabel')}
        variant="scrollable"
        allowScrollButtonsMobile
        searchable={false}
      />
      <Box {...tabPanelProps(ID_PREFIX, tabs.value)}>
        <Stack spacing={1.5}>
          <Box component="ol" sx={{ m: 0, pl: 3 }}>
            {guide.stepKeys.map((key) => (
              <Typography key={key} component="li" variant="body2" sx={{ mb: 0.75 }}>
                {t(key)}
              </Typography>
            ))}
          </Box>
          <CodeBlock code={guide.snippet(url)} copyLabel={t(guide.copyKey)} />
        </Stack>
      </Box>
    </Stack>
  );
}
