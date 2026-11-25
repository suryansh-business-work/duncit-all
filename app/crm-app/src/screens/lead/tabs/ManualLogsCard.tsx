import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import { htmlToText } from './ManualLogsHtml';
import { PersonName, type LogPeople } from './ManualLogsPeople';
import type { LogActivity } from './ManualLogsState';
import { TabIconButton } from './TabIconButton';

interface Props {
  log: LogActivity;
  people: LogPeople;
  onEdit: (log: LogActivity) => void;
  onDelete: (log: LogActivity) => void;
}

/** "by <name>", the name opening that person's details. */
function By({ userId, people }: Readonly<{ userId?: string | null; people: LogPeople }>) {
  const { t } = useTranslation();
  if (!userId) return null;
  return (
    <XStack gap="$1" alignItems="center">
      <Text color="$muted" fontSize="$2">
        {t('crm.manualLogs.by')}
      </Text>
      <PersonName userId={userId} people={people} />
    </XStack>
  );
}

/** A deleted log keeps its place, like a deleted chat message: who, when, and nothing else. */
function DeletedLog({ log, people }: Readonly<Pick<Props, 'log' | 'people'>>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <XStack
      {...SURFACE}
      backgroundColor="$soft"
      gap="$2"
      alignItems="center"
      flexWrap="wrap"
      testID="manual-log-deleted"
    >
      <MaterialIcons name="block" size={18} color={theme.muted?.val} accessibilityElementsHidden />
      <Text color="$muted" fontStyle="italic">
        {t('crm.manualLogs.deletedNotice')}
      </Text>
      <By userId={log.deleted_by} people={people} />
      <Text color="$muted" fontSize="$2">
        {displayDateTime(log.deleted_at) || t('crmApp.common.dash')}
      </Text>
    </XStack>
  );
}

/** One manual log: its title, when and by whom, whether it was edited, and edit / delete when allowed. */
export function ManualLogsCard({ log, people, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  if (log.is_deleted) return <DeletedLog log={log} people={people} />;
  const title = log.summary || t('crm.manualLogs.untitled');
  // The server decides who may change a log (its author, or a SUPER_ADMIN) and checks again on save.
  const canChange = log.can_change && Boolean(log.id);
  return (
    <YStack {...SURFACE} gap="$2" testID="manual-log-card">
      <XStack gap="$2" alignItems="center" flexWrap="wrap">
        {log.summary ? (
          <Text fontWeight="700" flexShrink={1}>
            {log.summary}
          </Text>
        ) : null}
        <ToneChip
          label={displayDateTime(log.created_at) || t('crmApp.common.dash')}
          tone="default"
        />
        <By userId={log.created_by} people={people} />
        {log.updated_at ? (
          <ToneChip
            label={t('crm.manualLogs.editedAt', {
              vars: { time: displayDateTime(log.updated_at) },
            })}
            tone="info"
          />
        ) : null}
      </XStack>
      <Text selectable>{log.body_text || htmlToText(log.body_html)}</Text>
      {canChange ? (
        <XStack justifyContent="flex-end">
          <TabIconButton
            icon="edit"
            label={t('crm.common.editNamed', { vars: { name: title } })}
            onPress={() => onEdit(log)}
            testID="manual-log-edit"
          />
          <TabIconButton
            icon="delete-outline"
            label={t('crm.common.deleteNamed', { vars: { name: title } })}
            onPress={() => onDelete(log)}
            testID="manual-log-delete"
          />
        </XStack>
      ) : null}
    </YStack>
  );
}
