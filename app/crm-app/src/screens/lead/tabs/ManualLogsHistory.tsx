import { Text, XStack, YStack } from 'tamagui';
import { CRM_LOG_HISTORY_VIEW } from '@duncit/utils';

import { Card } from '@/components/Card';
import { ToneChip } from '@/components/ToneChip';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import { PersonName, type LogPeople } from './ManualLogsPeople';
import type { LogActivity } from './ManualLogsState';

/** Log activity: one row per Created / Updated / Deleted change, newest first. */
export function ManualLogsHistory({
  entries,
  people,
}: Readonly<{ entries: readonly LogActivity[]; people: LogPeople }>) {
  const { t } = useTranslation();
  if (entries.length === 0) return null;
  return (
    <Card title={t('crm.manualLogs.historyTitle')} testID="manual-log-history">
      <YStack gap="$2" role="list">
        {entries.map((entry, index) => {
          const view = CRM_LOG_HISTORY_VIEW[entry.type];
          if (!view) return null;
          return (
            <XStack
              key={`${entry.type}-${entry.target ?? ''}-${entry.created_at ?? index}`}
              gap="$2"
              alignItems="center"
              flexWrap="wrap"
              role="listitem"
            >
              <ToneChip label={t(view.labelKey)} tone={view.tone} />
              {entry.created_by ? (
                <PersonName userId={entry.created_by} people={people} />
              ) : (
                <Text color="$muted" fontSize="$2">
                  {t('crm.people.unknown')}
                </Text>
              )}
              <Text color="$muted" fontSize="$2">
                {displayDateTime(entry.created_at) || t('crmApp.common.dash')}
              </Text>
            </XStack>
          );
        })}
      </YStack>
    </Card>
  );
}
