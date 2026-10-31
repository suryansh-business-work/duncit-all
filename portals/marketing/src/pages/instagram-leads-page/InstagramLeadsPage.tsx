import { useQuery } from '@apollo/client/react';
import { Alert, Box, LinearProgress, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { IG_LEAD_SETTINGS, type IgLeadSettings } from './queries';
import LeadsTab from './leads/LeadsTab';
import FindTab from './find/FindTab';
import SettingsTab from './settings/SettingsTab';

type Tab = 'leads' | 'find' | 'settings';
type Translate = ReturnType<typeof useTranslation>['t'];

const leadTabs = (t: Translate): DuncitTabItem<Tab>[] => [
  { value: 'leads', label: t('marketing.igLeads.tabLeads') },
  { value: 'find', label: t('marketing.igLeads.tabFind') },
  { value: 'settings', label: t('marketing.igLeads.tabSettings') },
];

/**
 * Marketing → Instagram Leads: describe the businesses wanted, let the AI and
 * Google find their Instagram profiles, then work each one — an AI-drafted DM
 * sent from Instagram by the marketer, and follow-ups on the schedule in
 * Settings until they reply.
 */
export default function InstagramLeadsPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<Tab>({ items: leadTabs(t), fallback: 'leads' });
  const { data, loading, error } = useQuery<{ igLeadSettings: IgLeadSettings }>(IG_LEAD_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const settings = data?.igLeadSettings ?? null;

  return (
    <Box sx={{ p: 2 }} data-testid="instagram-leads-page">
      <PageHeader title={t('marketing.igLeads.title')} subtitle={t('marketing.igLeads.subtitle')} sx={{ mb: 2 }} />
      <DuncitTabs {...tabs} idPrefix="ig-leads" variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }} />
      {loading && !settings && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {parseApiError(error)}
        </Alert>
      )}
      {settings && (!settings.serper_ready || !settings.instagram_ready) && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {!settings.serper_ready && <Alert severity="warning">{t('marketing.igLeads.needSerper')}</Alert>}
          {!settings.instagram_ready && <Alert severity="warning">{t('marketing.igLeads.needInstagram')}</Alert>}
        </Stack>
      )}
      <Box {...tabPanelProps('ig-leads', tabs.value)}>
        {tabs.value === 'leads' && <LeadsTab settings={settings} />}
        {tabs.value === 'find' && <FindTab />}
        {tabs.value === 'settings' && settings && <SettingsTab settings={settings} />}
      </Box>
    </Box>
  );
}
