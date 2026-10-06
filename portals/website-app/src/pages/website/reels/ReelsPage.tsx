import { Stack } from '@mui/material';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { WebsiteNavSite } from '@duncit/gql-types';
import { NAV_SITES } from '../navigation/queries';
import ReelsManager from './ReelsManager';

/** Reel Slider manager — the reels each marketing website's home page plays. */
export default function ReelsPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<WebsiteNavSite>({ items: NAV_SITES, fallback: 'MAIN' });

  return (
    <Stack spacing={2}>
      <PageHeader title={t('websiteApp.reels.title')} subtitle={t('websiteApp.reels.subtitle')} titleWeight={700} />
      <DuncitTabs {...tabs} variant="scrollable" />
      <ReelsManager key={tabs.value} site={tabs.value} />
    </Stack>
  );
}
