import { Box } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import LiveTab from './live/LiveTab';
import ThemesTab from './themes/ThemesTab';
import ScheduleTab from './schedule/ScheduleTab';
import AppIconsTab from './app-icons/AppIconsTab';
import StoreOccasionsTab from './store/StoreOccasionsTab';

type Tab = 'live' | 'themes' | 'schedule' | 'app-icons' | 'store';
type Translate = ReturnType<typeof useTranslation>['t'];

const occasionTabs = (t: Translate): DuncitTabItem<Tab>[] => [
  { value: 'live', label: t('marketing.occasions.tabs.live') },
  { value: 'themes', label: t('marketing.occasions.tabs.themes') },
  { value: 'schedule', label: t('marketing.occasions.tabs.schedule') },
  { value: 'app-icons', label: t('marketing.occasions.tabs.appIcons') },
  { value: 'store', label: t('marketing.occasions.tabs.store') },
];

/**
 * Marketing → Occasions: the festive looks every Duncit app wears — what is
 * live now, the catalogue of looks and their editor, the dates that switch
 * them on, the app's festive icons and the ecomm store's own looks.
 */
export default function OccasionsPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<Tab>({ items: occasionTabs(t), fallback: 'live' });

  return (
    <Box sx={{ p: 2 }} data-testid="occasions-page">
      <PageHeader title={t('marketing.occasions.title')} subtitle={t('marketing.occasions.subtitle')} sx={{ mb: 2 }} />
      <DuncitTabs {...tabs} idPrefix="occasions" variant="scrollable" scrollButtons="auto" sx={{ mb: 2.5 }} />
      <Box {...tabPanelProps('occasions', tabs.value)}>
        {tabs.value === 'live' && <LiveTab />}
        {tabs.value === 'themes' && <ThemesTab />}
        {tabs.value === 'schedule' && <ScheduleTab />}
        {tabs.value === 'app-icons' && <AppIconsTab />}
        {tabs.value === 'store' && <StoreOccasionsTab />}
      </Box>
    </Box>
  );
}
