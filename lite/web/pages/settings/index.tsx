import { useMemo, type ReactNode } from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { LanguageSelect } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { SignedInGate } from '../../components/SignedInGate';
import { usePageTitle } from '../../lib/usePageTitle';
import { ContactSection } from './ContactSection';
import { DisplayPicker } from './DisplayPicker';
import { PaymentForm } from './payment-form';
import { ProfileForm } from './profile-form';

type SettingsTab = 'account' | 'preferences' | 'payment';
const TAB_VALUES: SettingsTab[] = ['account', 'preferences', 'payment'];
const TABS_ID = 'settings';

/** A titled part of a settings tab. */
function Part({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Stack component="section" spacing={1.5}>
      <Typography variant="h3" component="h2">
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

function Preferences() {
  const { t, locale, locales, setLocale } = useWebT();
  return (
    <Stack spacing={4} divider={<Divider flexItem />}>
      <Part title={t('liteWeb.settings.display')}>
        <DisplayPicker />
      </Part>
      <Part title={t('liteWeb.settings.language')}>
        <Box sx={{ maxWidth: 280 }}>
          <LanguageSelect value={locale} options={locales} onChange={setLocale} size="small" />
        </Box>
      </Part>
    </Stack>
  );
}

function SettingsBody({ tab }: Readonly<{ tab: SettingsTab }>) {
  const { t } = useWebT();
  const { me } = useLiteSession();
  if (tab === 'preferences') return <Preferences />;
  if (!me) return null;
  if (tab === 'payment') {
    return (
      <Part title={t('liteWeb.profile.paymentsTitle')}>
        <PaymentForm key={me.id} me={me} />
      </Part>
    );
  }
  return (
    <Stack spacing={4} divider={<Divider flexItem />}>
      <Part title={t('liteWeb.settings.profile')}>
        <ProfileForm key={me.id} me={me} />
      </Part>
      <Part title={t('liteWeb.settings.contacts')}>
        <ContactSection me={me} />
      </Part>
    </Stack>
  );
}

/** /settings (and /profile) — Account, Preferences and Payment, the tab kept in the URL. */
export function SettingsPage() {
  const { t } = useWebT();
  usePageTitle(t('liteWeb.settings.title'));
  const items = useMemo<DuncitTabItem<SettingsTab>[]>(() => TAB_VALUES.map((value) => ({ value, label: t(`liteWeb.settings.tabs.${value}`), testId: `settings-tab-${value}` })), [t]);
  const tabs = useTabParam<SettingsTab>({ items, fallback: 'account' });
  return (
    <Stack spacing={2} sx={{ maxWidth: 680, mx: 'auto' }} data-testid="settings-page">
      <Typography variant="h2" component="h1">
        {t('liteWeb.settings.title')}
      </Typography>
      <DuncitTabs {...tabs} idPrefix={TABS_ID} searchable={false} />
      <Box {...tabPanelProps(TABS_ID, tabs.value)} sx={{ pt: 2 }}>
        {tabs.value === 'preferences' ? (
          <SettingsBody tab="preferences" />
        ) : (
          <SignedInGate body={t('liteWeb.profile.gate')}>
            <SettingsBody tab={tabs.value} />
          </SignedInGate>
        )}
      </Box>
    </Stack>
  );
}
