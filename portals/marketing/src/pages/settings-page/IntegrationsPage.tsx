import { Box, Stack, Typography } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import EnvAccessGate from '../../../../tech/src/pages/environment/access-gate';
import EnvVariablesTab from '../../../../tech/src/pages/environment/EnvVariablesTab';
import { DEFAULT_INTEGRATION_TAB, INTEGRATION_TABS, integrationTabFor, type IntegrationCategory } from './integrations-tabs';
import RedirectUrlCard from './RedirectUrlCard';

/**
 * Marketing → Settings → Integrations: the keys this console runs on, one tab
 * per app. Each network is its own entry — Instagram, Facebook and Threads
 * are three separate apps — so each is set up, tested and rotated on its own.
 * The editor is the Tech console's, mounted here behind the same emailed
 * root-admin code; the server confines a marketing manager to these categories.
 */
export default function IntegrationsPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<IntegrationCategory>({
    items: INTEGRATION_TABS.map((tab) => ({ value: tab.category, label: t(tab.labelKey) })),
    fallback: DEFAULT_INTEGRATION_TAB,
  });
  const active = integrationTabFor(tabs.value);

  return (
    <Box sx={{ p: 2 }} data-testid="integrations-page">
      <PageHeader title={t('marketing.integrations.title')} subtitle={t('marketing.integrations.subtitle')} sx={{ mb: 2 }} />
      <DuncitTabs {...tabs} idPrefix="integrations" variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }} />
      <Box {...tabPanelProps('integrations', tabs.value)}>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="integration-hint">
            {t(active.hintKey)}
          </Typography>
          <EnvAccessGate>
            <Stack spacing={2}>
              {active.social && <RedirectUrlCard />}
              <EnvVariablesTab category={active.category} />
            </Stack>
          </EnvAccessGate>
        </Stack>
      </Box>
    </Box>
  );
}
