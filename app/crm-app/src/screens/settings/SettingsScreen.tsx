import { ScrollView } from 'react-native';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { hasPhoneFeatures } from '@/services/permissions';
import { useTranslation } from '@/hooks/useTranslation';
import { useFeaturesStore } from '@/stores/features.store';
import { CallLineCard } from './CallLineCard';
import { CallingCard } from './calling/CallingCard';
import { HomeScreenCard } from './HomeScreenCard';
import { PermissionsCard } from './PermissionsCard';
import { SyncCard } from './SyncCard';
import { ToggleRow } from './ToggleRow';

/**
 * The app's own settings, opened from More: the call features, the CRM call
 * line, permissions, the home-screen dialer icon and the caller-ID sync. The
 * account, sign-out and app version live on More itself. On an iPhone only the
 * CRM call line applies: the rest reads the Android call log.
 */
export function SettingsScreen() {
  const { t } = useTranslation();
  const features = useFeaturesStore();
  const phone = hasPhoneFeatures();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
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
          <CallingCard />
          <SyncCard />
        </>
      ) : null}
    </ScrollView>
  );
}
