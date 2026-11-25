import { formatDateTime } from '@duncit/datetime';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { ToneChip } from '@/components/ToneChip';
import type { CalendarEvent } from '@/features/reminders/calendarView';
import { isLeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import type { ReminderItem } from './ReminderRow';

interface Props {
  event: CalendarEvent<ReminderItem>;
  busy: boolean;
  onOpenLead: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** A labelled block of the details: FROM, NOTES. */
function Section({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <YStack gap="$1">
      <Text color="$muted" fontSize="$2" fontWeight="700">
        {label}
      </Text>
      <Text>{value}</Text>
    </YStack>
  );
}

/** A calendar event's details and what can be done with it — the portal's event drawer. */
export function RemindersEventDetails({
  event,
  busy,
  onOpenLead,
  onToggle,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const isReminder = event.kind === 'reminder';
  const done = event.status === 'DONE';
  const kindLabel = isLeadKind(event.entity)
    ? t(`crmApp.kind.${event.entity}`)
    : t('crm.calendar.general');
  let from = t('crmApp.common.dash');
  if (event.leadName) from = event.leadName;
  else if (event.entity === 'GENERAL') from = t('crm.calendar.generalReminder');
  return (
    <YStack gap="$3">
      <Text color="$muted" fontWeight="700">
        {isReminder ? t('crm.calendar.reminder') : t('crm.calendar.followUp')}
      </Text>
      <Text fontSize="$6" fontWeight="800" role="heading" testID="event-title">
        {event.title}
      </Text>
      <XStack flexWrap="wrap" gap="$2">
        <ToneChip label={formatDateTime(event.date)} tone="default" />
        <ToneChip label={kindLabel} tone="info" />
        {isReminder ? (
          <ToneChip
            label={done ? t('crm.components.done') : t('crm.components.pending')}
            tone={done ? 'success' : 'default'}
          />
        ) : null}
      </XStack>
      <Section label={t('crm.calendar.from')} value={from} />
      {event.notes ? <Section label={t('crm.calendar.notes')} value={event.notes} /> : null}
      {event.leadId && isLeadKind(event.entity) ? (
        <DuncitButton
          label={t('crm.calendar.openLead')}
          onPress={onOpenLead}
          fullWidth
          testID="event-open-lead"
        />
      ) : null}
      {isReminder ? (
        <XStack flexWrap="wrap" gap="$2">
          <DuncitButton
            label={done ? t('crm.calendar.markPending') : t('crm.calendar.markDone')}
            onPress={onToggle}
            variant="outline"
            size="sm"
            loading={busy}
            testID="event-toggle"
          />
          <DuncitButton
            label={t('shell.common.edit')}
            onPress={onEdit}
            variant="outline"
            size="sm"
            disabled={busy}
            testID="event-edit"
          />
          <DuncitButton
            label={t('shell.common.delete')}
            onPress={onDelete}
            variant="outline"
            tone="danger"
            size="sm"
            disabled={busy}
            testID="event-delete"
          />
        </XStack>
      ) : null}
    </YStack>
  );
}
