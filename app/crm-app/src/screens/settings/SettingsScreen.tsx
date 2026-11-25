import { ScrollView } from 'react-native';
import { Text } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { appVersion } from '@/services/feedback';
import { hasPhoneFeatures } from '@/services/permissions';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth.store';
import { useFeaturesStore } from '@/stores/features.store';
import { CallLineCard } from './CallLineCard';
import { HomeScreenCard } from './HomeScreenCard';
import { PermissionsCard } from './PermissionsCard';
import { SyncCard } from './SyncCard';
import { ToggleRow } from './ToggleRow';

/**
 * The account, the call features, the CRM call line, permissions, the
 * home-screen dialer icon and the caller-ID sync. On an iPhone only the
 * account and the CRM call line apply: the rest reads the Android call log.
 */
export function SettingsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const features = useFeaturesStore();
  const phone = hasPhoneFeatures();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card title={t('crmApp.settings.account')}>
        {name ? <Text fontWeight="600">{name}</Text> : null}
        {user?.email ? <Text color="$muted">{user.email}</Text> : null}
        <DuncitButton
          label={t('crmApp.settings.signOut')}
          onPress={() =>
            fireAndForget(signOut(), logs.mobileApp, 'crm-app/SettingsScreen', 'signOut')
          }
          variant="outline"
          tone="danger"
          testID="settings-sign-out"
        />
      </Card>
      {phone ? (
        <Card title={t('crmApp.settings.calls')}>
          <ToggleRow
            id="feature-caller-id"
            label={t('crmApp.settings.callerId')}
            hint={t('crmApp.settings.callerIdHint')}
            value={features.callerId}
            onChange={(callerId) =>
              fireAndForget(
                features.set({ callerId }),
                logs.mobileApp,
                'crm-app/SettingsScreen',
                'set',
              )
            }
          />
          <ToggleRow
            id="feature-auto-log"
            label={t('crmApp.settings.autoLog')}
            hint={t('crmApp.settings.autoLogHint')}
            value={features.autoLog}
            onChange={(autoLog) =>
              fireAndForget(
                features.set({ autoLog }),
                logs.mobileApp,
                'crm-app/SettingsScreen',
                'set',
              )
            }
          />
          <ToggleRow
            id="feature-recordings"
            label={t('crmApp.settings.recordings')}
            hint={t('crmApp.settings.recordingsHint')}
            value={features.recordings}
            onChange={(recordings) =>
              fireAndForget(
                features.set({ recordings }),
                logs.mobileApp,
                'crm-app/SettingsScreen',
                'set',
              )
            }
          />
        </Card>
      ) : null}
      <CallLineCard />
      {phone ? (
        <>
          <HomeScreenCard />
          <PermissionsCard />
          <SyncCard />
        </>
      ) : null}
      <Text color="$muted" textAlign="center">
        {t('crmApp.settings.version', { vars: { version: appVersion() } })}
      </Text>
    </ScrollView>
  );
}
