import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { CrmAppToggleReminderDocument } from '@/graphql/reminders';
import { displayDateTime, isOverdue } from '@/features/reminders/reminderTime';
import { isLeadKind } from '@/features/leads/leadKinds';
import { gqlRequest } from '@/services/graphql.client';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';

export interface ReminderItem {
  id: string;
  entity_type: string;
  lead_id?: string | null;
  title: string;
  due_at: string;
  notes?: string | null;
  status: string;
}

interface Props {
  reminder: ReminderItem;
  onChanged: () => void;
}

/** The round tick: marks the reminder done, or pending again. */
function ReminderCheck({
  reminder,
  busy,
  onToggle,
}: Readonly<{ reminder: ReminderItem; busy: boolean; onToggle: () => void }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const done = reminder.status === 'DONE';
  const vars = { vars: { title: reminder.title } };
  return (
    <XStack
      role="checkbox"
      aria-checked={done}
      aria-label={
        done ? t('crmApp.reminder.markPending', vars) : t('crmApp.reminder.markDone', vars)
      }
      aria-busy={busy}
      onPress={busy ? undefined : onToggle}
      hitSlop={8}
      testID={`reminder-toggle-${reminder.id}`}
    >
      <MaterialIcons
        name={done ? 'check-circle' : 'radio-button-unchecked'}
        size={26}
        color={theme.accentText?.val}
      />
    </XStack>
  );
}

/** One reminder: tick it done (or not), open its lead. */
export function ReminderRow({ reminder, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const done = reminder.status === 'DONE';
  const overdue = isOverdue(reminder);

  const toggle = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await gqlRequest(CrmAppToggleReminderDocument, { id: reminder.id });
      onChanged();
    } catch (error) {
      logs.mobileApp.warn('crm-app/ReminderRow', 'toggle', { error });
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const kind = reminder.entity_type;
  const leadId = reminder.lead_id;
  const openLead =
    isLeadKind(kind) && leadId
      ? () => navigation.navigate('LeadDetail', { kind, id: leadId })
      : undefined;

  return (
    <XStack gap="$3" paddingVertical="$2" alignItems="center" testID={`reminder-${reminder.id}`}>
      <ReminderCheck
        reminder={reminder}
        busy={busy}
        onToggle={() => fireAndForget(toggle(), logs.mobileApp, 'crm-app/ReminderRow', 'toggle')}
      />
      <YStack flex={1} onPress={openLead} role={openLead ? 'link' : undefined}>
        <Text fontWeight="600" textDecorationLine={done ? 'line-through' : 'none'}>
          {reminder.title}
        </Text>
        <Text color={overdue ? '$danger' : '$muted'} fontSize="$2">
          {overdue ? `${t('crmApp.reminder.overdue')} · ` : ''}
          {displayDateTime(reminder.due_at)}
        </Text>
        {failed ? (
          <Text color="$danger" fontSize="$2">
            {t('crmApp.common.saveFailed')}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
