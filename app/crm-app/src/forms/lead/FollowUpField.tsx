import { addDays, startOfDay } from 'date-fns';
import { useController, type Control } from 'react-hook-form';
import { Label, Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadFormValues } from '@/features/leads/editor/values';

/** One-tap follow-up dates, counted in days from today (the start of that day, as the portal's date field stores it). */
export const FOLLOW_UP_DAYS = [1, 3, 7, 14] as const;

export const followUpOn = (days: number, now: Date = new Date()): string =>
  startOfDay(addDays(now, days)).toISOString();

/** The lead's next follow-up: the date it holds now, a quick choice of days from today, or none. */
export function FollowUpField({ control }: Readonly<{ control: Control<LeadFormValues> }>) {
  const { t } = useTranslation();
  const { field } = useController({ control, name: 'next_follow_up_date' as never });
  const value = (field.value as string | null | undefined) ?? null;
  return (
    <YStack gap="$2">
      <Label fontWeight="600">{t('crmApp.lead.followUp')}</Label>
      <Text color="$muted" testID="follow-up-value">
        {value ? displayDateTime(value) : t('crmApp.editor.noFollowUp')}
      </Text>
      <XStack flexWrap="wrap" gap="$2">
        {FOLLOW_UP_DAYS.map((days) => (
          <DuncitButton
            key={days}
            label={t('crmApp.editor.inDays', { count: days, vars: { count: days } })}
            onPress={() => field.onChange(followUpOn(days))}
            variant="outline"
            size="sm"
            testID={`follow-up-${days}`}
          />
        ))}
        {value ? (
          <DuncitButton
            label={t('crmApp.editor.clearFollowUp')}
            onPress={() => field.onChange(null)}
            variant="ghost"
            size="sm"
            testID="follow-up-clear"
          />
        ) : null}
      </XStack>
    </YStack>
  );
}
