import { useMemo } from 'react';
import { Box } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import ExternalLinksTab from './ExternalLinksTab';
import LinkPrivacyTab from './privacy/LinkPrivacyTab';

type Tab = 'links' | 'privacy';

/** Marketing → External Links. */
export default function ExternalLinksPage() {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<Tab>[]>(
    () => [
      { value: 'links', label: t('marketing.externalLinks.tabLinks'), testId: 'external-links-tab-links' },
      {
        value: 'privacy',
        label: t('marketing.externalLinks.tabPrivacy'),
        testId: 'external-links-tab-privacy',
      },
    ],
    [t],
  );
  const tabs = useTabParam({ items, fallback: 'links' as Tab });

  return (
    <Box sx={{ p: 2 }} data-testid="external-links-page">
      <PageHeader
        title={t('marketing.externalLinks.title')}
        subtitle={t('marketing.externalLinks.subtitle')}
        sx={{ mb: 2 }}
      />
      <DuncitTabs {...tabs} idPrefix="external-links" sx={{ mb: 2 }} />
      <Box {...tabPanelProps('external-links', tabs.value)}>
        {tabs.value === 'links' && <ExternalLinksTab />}
        {tabs.value === 'privacy' && <LinkPrivacyTab />}
      </Box>
    </Box>
  );
}
