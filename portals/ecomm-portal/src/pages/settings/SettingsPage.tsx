import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Card, CardContent, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { runAction } from '../../lib/actions';
import { SAVE_SETTINGS, STORE_SETTINGS } from './queries';
import SettingsTabForm, {
  AUTOSHIP_TAB,
  CHECKOUT_TAB,
  GENERAL_TAB,
  OCCASIONS_TAB,
  PAGES_TAB,
  RETURNS_TAB,
  SEO_TAB,
  SHIPPING_TAB,
  type SettingsTab,
  type StoreSettings,
} from './settings-form';

const TAB_KEYS: Record<SettingsTab, string> = {
  general: 'ecommPortal.settings.tabGeneral',
  checkout: 'ecommPortal.settings.tabCheckout',
  shipping: 'ecommPortal.settings.tabShipping',
  returns: 'ecommPortal.settings.tabReturns',
  autoship: 'ecommPortal.settings.tabAutoship',
  seo: 'ecommPortal.common.seo',
  pages: 'ecommPortal.settings.tabPages',
  occasions: 'ecommPortal.settings.tabOccasions',
};

const TABS = Object.keys(TAB_KEYS) as SettingsTab[];

interface PanelProps {
  settings: StoreSettings;
  saving: boolean;
  onSave: (input: Record<string, unknown>) => Promise<boolean>;
}

/** The open tab's own form — each keyed so switching tabs starts from the saved settings. */
function SettingsPanel({ tab, ...props }: Readonly<PanelProps & { tab: SettingsTab }>) {
  switch (tab) {
    case 'checkout':
      return <SettingsTabForm key={tab} spec={CHECKOUT_TAB} {...props} />;
    case 'shipping':
      return <SettingsTabForm key={tab} spec={SHIPPING_TAB} {...props} />;
    case 'returns':
      return <SettingsTabForm key={tab} spec={RETURNS_TAB} {...props} />;
    case 'autoship':
      return <SettingsTabForm key={tab} spec={AUTOSHIP_TAB} {...props} />;
    case 'seo':
      return <SettingsTabForm key={tab} spec={SEO_TAB} {...props} />;
    case 'pages':
      return <SettingsTabForm key={tab} spec={PAGES_TAB} {...props} />;
    case 'occasions':
      return <SettingsTabForm key={tab} spec={OCCASIONS_TAB} {...props} />;
    default:
      return <SettingsTabForm key={tab} spec={GENERAL_TAB} {...props} />;
  }
}

/** The pet store's own settings, one tab per concern; each tab saves only what it shows. */
export default function SettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(STORE_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save, saveState] = useMutation(SAVE_SETTINGS, {
    refetchQueries: ['StoreAdminSettings', 'StoreCancelReasons', 'StoreAutoshipTerms'],
  });
  const items = useMemo<DuncitTabItem<SettingsTab>[]>(() => TABS.map((value) => ({ value, label: t(TAB_KEYS[value]) })), [t]);
  const tabs = useTabParam<SettingsTab>({ items, fallback: 'general' });
  const settings = data?.storeAdminSettings;
  const onSave = (input: Record<string, unknown>) =>
    runAction(() => save({ variables: { input } }), t('ecommPortal.common.saved'));
  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.settings')} subtitle={t('ecommPortal.settings.subtitle')} />
      <DuncitTabs {...tabs} idPrefix="store-settings" variant="scrollable" allowScrollButtonsMobile aria-label={t('ecommPortal.nav.settings')} />
      <QueryGuard loading={loading && !settings} error={error}>
        {() =>
          settings && (
            <Card variant="outlined" {...tabPanelProps('store-settings', tabs.value)}>
              <CardContent>
                <SettingsPanel tab={tabs.value} settings={settings} saving={saveState.loading} onSave={onSave} />
              </CardContent>
            </Card>
          )
        }
      </QueryGuard>
    </Stack>
  );
}
