import { Text, YStack } from 'tamagui';

import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import type { SyncStatus } from '@/services/sync-status';

interface Props {
  status: SyncStatus;
  pendingRecordings: number;
}

const when = (ms: number) => displayDateTime(new Date(ms).toISOString());

/** When calls and recordings last reached the CRM, what is waiting, and what could not be sent. */
export function SyncHealth({ status, pendingRecordings }: Readonly<Props>) {
  const { t } = useTranslation();
  const never = t('crmApp.calling.never');
  return (
    <YStack gap="$1" testID="calling-sync-health">
      <Text color="$muted" testID="calling-last-call-sync">
        {t('crmApp.calling.lastCallSync', {
          vars: { time: status.callAt ? when(status.callAt) : never },
        })}
      </Text>
      <Text color="$muted" testID="calling-last-recording-sync">
        {t('crmApp.calling.lastRecordingSync', {
          vars: { time: status.recordingAt ? when(status.recordingAt) : never },
        })}
      </Text>
      <Text color="$muted" testID="calling-pending">
        {t('crmApp.calling.pendingUploads', { vars: { count: pendingRecordings } })}
      </Text>
      {status.failures.length > 0 ? (
        <YStack gap="$1" paddingTop="$1">
          <Text fontWeight="600">{t('crmApp.calling.failures')}</Text>
          {[...status.failures].reverse().map((f) => (
            <Text key={`${f.at}-${f.what}-${f.code}`} color="$danger" fontSize="$2">
              {t(
                f.what === 'call'
                  ? 'crmApp.calling.failureCall'
                  : 'crmApp.calling.failureRecording',
                {
                  vars: { time: when(f.at), code: f.code },
                },
              )}
            </Text>
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}
