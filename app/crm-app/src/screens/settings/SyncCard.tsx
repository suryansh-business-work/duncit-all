import { useCallback, useEffect, useState } from 'react';
import { Text } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { syncDeviceCalls } from '@/services/call-sync';
import { readDirectoryStatus, syncDirectory, type DirectoryStatus } from '@/services/directory-sync';
import { useTranslation } from '@/hooks/useTranslation';

/** The offline caller-ID directory: when it was last synced, how many numbers, and Sync now. */
export function SyncCard() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<DirectoryStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => {
    readDirectoryStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(refresh, [refresh]);

  const syncNow = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await syncDirectory();
      await syncDeviceCalls();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const synced = status?.syncedAt
    ? t('crmApp.settings.lastSync', { vars: { time: displayDateTime(new Date(status.syncedAt).toISOString()), count: status.count } })
    : t('crmApp.settings.neverSynced');

  return (
    <Card title={t('crmApp.settings.sync')}>
      <Text color="$muted" testID="settings-sync-status">
        {synced}
      </Text>
      <DuncitButton label={t('crmApp.settings.syncNow')} onPress={() => fireAndForget(syncNow(), logs.mobileApp, 'crm-app/SyncCard', 'syncNow')} loading={busy} variant="outline" testID="settings-sync" fullWidth />
      {failed ? (
        <Text color="$danger" role="alert">
          {t('crmApp.settings.syncFailed')}
        </Text>
      ) : null}
    </Card>
  );
}
