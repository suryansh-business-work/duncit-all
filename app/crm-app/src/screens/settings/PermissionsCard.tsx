import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { readPermissions, requestPermission, type PermissionGroup, type PermissionState } from '@/services/permissions';
import { useTranslation } from '@/hooks/useTranslation';

const ROWS: Array<{ group: PermissionGroup; label: string }> = [
  { group: 'phone', label: 'crmApp.settings.permPhone' },
  { group: 'call', label: 'crmApp.settings.permCall' },
  { group: 'overlay', label: 'crmApp.settings.permOverlay' },
  { group: 'notifications', label: 'crmApp.settings.permNotifications' },
  { group: 'audio', label: 'crmApp.settings.permAudio' },
];

/** What the call features need from Android, each with its own Allow — re-read when the person returns from Settings. */
export function PermissionsCard() {
  const { t } = useTranslation();
  const [state, setState] = useState<PermissionState | null>(null);

  const refresh = useCallback(() => {
    readPermissions()
      .then(setState)
      .catch(() => setState(null));
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (next) => next === 'active' && refresh());
    return () => subscription.remove();
  }, [refresh]);

  const allow = async (group: PermissionGroup) => {
    await requestPermission(group);
    refresh();
  };

  return (
    <Card title={t('crmApp.settings.permissions')}>
      {ROWS.map(({ group, label }) => (
        <XStack key={group} alignItems="center" justifyContent="space-between" paddingVertical="$1" gap="$2">
          <Text flex={1}>{t(label)}</Text>
          {state?.[group] ? (
            <Text color="$success" fontWeight="600" testID={`perm-${group}-ok`}>
              {t('crmApp.settings.allowed')}
            </Text>
          ) : (
            <YStack>
              <DuncitButton label={t('crmApp.settings.allow')} onPress={() => fireAndForget(allow(group), logs.mobileApp, 'crm-app/PermissionsCard', 'allow')} size="sm" variant="soft" accessibilityLabel={`${t('crmApp.settings.allow')} ${t(label)}`} testID={`perm-${group}`} />
            </YStack>
          )}
        </XStack>
      ))}
    </Card>
  );
}
