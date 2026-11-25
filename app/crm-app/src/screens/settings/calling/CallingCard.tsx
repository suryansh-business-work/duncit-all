import { useState } from 'react';
import { Linking } from 'react-native';
import { Text, XStack } from 'tamagui';
import { CrmTelephony } from 'crm-telephony';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import { syncDeviceCalls } from '@/services/call-sync';
import { callingRows, type CallingRow, type RowAction } from './callingRows';
import { DiagnosticRow } from './DiagnosticRow';
import { SyncHealth } from './SyncHealth';
import { useCallingDiagnostics } from './useCallingDiagnostics';

const SCOPE = 'crm-app/CallingCard';
const TEST_RESULT_KEYS = {
  overlay: 'crmApp.calling.testShown',
  notification: 'crmApp.calling.testNotification',
  empty: 'crmApp.calling.testEmpty',
} as const;

/**
 * Settings › Calling & recording: why caller ID or call logging might not be
 * working on this phone, and the fix for each — plus a caller-card test, a
 * recording-sync test and the sync health (last syncs, waiting uploads, the
 * last calls that could not be sent).
 */
export function CallingCard() {
  const { t } = useTranslation();
  const { health, failed, refresh } = useCallingDiagnostics();
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const act = (action: RowAction) => {
    if (action === 'redirectionRole') {
      if (!CrmTelephony?.requestRedirectionRole()) setMessage(t('crmApp.calling.roleUnavailable'));
      return;
    }
    fireAndForget(Linking.openSettings(), logs.mobileApp, SCOPE, 'openSettings');
  };

  const testCard = () => {
    const shown = CrmTelephony?.testCallerCard() ?? 'empty';
    setMessage(t(TEST_RESULT_KEYS[shown], { vars: { seconds: 8 } }));
  };

  const testRecordings = async () => {
    setSyncing(true);
    try {
      const result = await syncDeviceCalls();
      setMessage(
        t('crmApp.calling.recordingSyncResult', {
          vars: { attached: result.recordings, pending: result.pendingRecordings },
        }),
      );
    } catch {
      setMessage(t('crmApp.settings.syncFailed'));
    } finally {
      setSyncing(false);
      refresh();
    }
  };

  const label = (row: CallingRow) => (row.literal ? row.value : t(row.value));
  const rowAction = ({ action }: CallingRow) =>
    action
      ? {
          label: t(
            action === 'redirectionRole' ? 'crmApp.settings.allow' : 'crmApp.calling.openSettings',
          ),
          onPress: () => act(action),
        }
      : undefined;

  return (
    <Card title={t('crmApp.calling.title')} testID="calling-card">
      {failed ? (
        <Text color="$danger" role="alert">
          {t('crmApp.common.loadFailed')}
        </Text>
      ) : null}
      {health?.phone
        ? callingRows(health.phone, health.folders).map((row) => (
            <DiagnosticRow
              key={row.id}
              label={t(row.labelKey)}
              value={label(row)}
              tone={row.tone}
              hint={row.hintKey ? t(row.hintKey, { vars: row.hintVars }) : undefined}
              action={rowAction(row)}
              testID={`calling-${row.id}`}
            />
          ))
        : null}
      {health ? (
        <SyncHealth status={health.status} pendingRecordings={health.pendingRecordings} />
      ) : null}
      <XStack gap="$2" flexWrap="wrap">
        <DuncitButton
          label={t('crmApp.calling.testCallerId')}
          onPress={testCard}
          variant="outline"
          size="sm"
          testID="calling-test-card"
        />
        <DuncitButton
          label={t('crmApp.calling.testRecordingSync')}
          onPress={() => fireAndForget(testRecordings(), logs.mobileApp, SCOPE, 'testRecordings')}
          loading={syncing}
          variant="outline"
          size="sm"
          testID="calling-test-recordings"
        />
      </XStack>
      {message ? (
        <Text color="$muted" aria-live="polite" testID="calling-message">
          {message}
        </Text>
      ) : null}
    </Card>
  );
}
