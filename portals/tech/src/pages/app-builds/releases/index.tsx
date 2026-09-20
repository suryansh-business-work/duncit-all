import { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import AppleIcon from '@mui/icons-material/Apple';
import ShopIcon from '@mui/icons-material/Shop';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import ReleasesPanel from './ReleasesPanel';
import type { ReleaseStore } from './queries';

const TAB_PREFIX = 'store-releases';

/**
 * Releases — what the App Store and Google Play say about every version of
 * the app, read live when the page opens. A rejection shows its reason,
 * OpenAI's advice and the button that submits the latest build; the same
 * rejection has already been mailed and posted to Slack by the server.
 */
export default function ReleasesPage() {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<ReleaseStore>[]>(
    () => [
      { value: 'APP_STORE', label: t('tech.appBuilds.releaseStoreAppStore'), icon: <AppleIcon />, iconPosition: 'start', testId: 'releases-tab-apple' },
      { value: 'GOOGLE_PLAY', label: t('tech.appBuilds.releaseStoreGooglePlay'), icon: <ShopIcon />, iconPosition: 'start', testId: 'releases-tab-play' },
    ],
    [t]
  );
  const tabs = useTabParam<ReleaseStore>({ items, fallback: 'APP_STORE' });
  const storeLabel = t(tabs.value === 'APP_STORE' ? 'tech.appBuilds.releaseStoreAppStore' : 'tech.appBuilds.releaseStoreGooglePlay');

  return (
    <Box data-testid="releases-page">
      <Stack sx={{ mb: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          {t('tech.appBuilds.releasesTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('tech.appBuilds.releasesSubtitle')}
        </Typography>
      </Stack>
      <DuncitTabs {...tabs} idPrefix={TAB_PREFIX} aria-label={t('tech.appBuilds.releasesTabsLabel')} />
      <Box {...tabPanelProps(TAB_PREFIX, tabs.value)} sx={{ mt: 2 }}>
        {/* Keyed per store: the two tabs render the same component shape, so
            without a key React would reconcile in place and keep the other
            store's rows and dialog state. */}
        <ReleasesPanel key={tabs.value} store={tabs.value} ariaLabel={storeLabel} />
      </Box>
    </Box>
  );
}
