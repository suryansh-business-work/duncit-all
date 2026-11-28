import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LeadAvatar } from '@/components/LeadAvatar';
import { ListRow } from '@/components/mobile/ListRow';
import { ListSection } from '@/components/mobile/ListSection';
import { SURFACE } from '@/components/surface';
import { MOBILE } from '@/constants/design';
import { useScrollTopOnTabEntry } from '@/hooks/useScrollTopOnTabEntry';
import { useTranslation } from '@/hooks/useTranslation';
import { CRM_NAV, moreSections } from '@/navigation/crmNav';
import { openNavTarget } from '@/navigation/navTarget';
import type { AppStackParamList } from '@/navigation/types';
import { appVersion } from '@/services/feedback';
import { useAuthStore } from '@/stores/auth.store';

const SECTIONS = moreSections(CRM_NAV);

/**
 * The More tab: who is signed in, then every CRM portal sidebar page the tab
 * bar does not hold, grouped as the portal groups them, then the app's own
 * settings and sign-out. It replaces the old slide-in side menu, so every page
 * is two taps away and the thumb never reaches for the top corner.
 */
export function MoreScreen() {
  const { t } = useTranslation();
  const scrollRef = useScrollTopOnTabEntry<ScrollView>();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ padding: MOBILE.gutter, gap: 20, paddingBottom: 32 }}
      testID="more-list"
    >
      <XStack {...SURFACE} padding="$4" gap="$3" alignItems="center" testID="more-profile">
        <LeadAvatar name={name || user?.email || t('crmApp.login.title')} size={52} />
        <YStack flex={1} gap="$0.5">
          <Text fontSize="$6" fontWeight="800" numberOfLines={1}>
            {name || t('crmApp.login.title')}
          </Text>
          {user?.email ? (
            <Text color="$muted" numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
        </YStack>
      </XStack>
      {SECTIONS.map((section) => (
        <ListSection
          key={section.key}
          title={section.labelKey ? t(section.labelKey) : undefined}
          testID={`more-section-${section.key}`}
        >
          {section.items.map((item) => (
            <ListRow
              key={item.key}
              icon={item.icon}
              title={t(item.labelKey)}
              onPress={() => openNavTarget(navigation, item.target)}
              testID={`nav-${item.key}`}
            />
          ))}
        </ListSection>
      ))}
      <ListSection title={t('crmApp.more.app')} testID="more-section-app">
        <ListRow
          icon="settings"
          title={t('crmApp.tabs.settings')}
          subtitle={t('crmApp.more.settingsHint')}
          onPress={() => navigation.navigate('Settings')}
          testID="more-settings"
        />
        <ListRow
          icon="logout"
          title={t('crmApp.settings.signOut')}
          destructive
          chevron={false}
          onPress={() => setConfirmSignOut(true)}
          testID="more-sign-out"
        />
      </ListSection>
      <Text color="$muted" textAlign="center" fontSize="$2">
        {t('crmApp.settings.version', { vars: { version: appVersion() } })}
      </Text>
      <ConfirmDialog
        open={confirmSignOut}
        title={t('crmApp.settings.signOut')}
        message={t('crmApp.more.signOutConfirm')}
        confirmLabel={t('crmApp.settings.signOut')}
        cancelLabel={t('shell.common.cancel')}
        danger
        onConfirm={() => {
          setConfirmSignOut(false);
          fireAndForget(signOut(), logs.mobileApp, 'crm-app/MoreScreen', 'signOut');
        }}
        onCancel={() => setConfirmSignOut(false)}
        testID="more-sign-out-confirm"
      />
    </ScrollView>
  );
}
