import { useMemo } from 'react';
import { useController, useForm } from 'react-hook-form';
import { Label, Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  DUE_CHOICES,
  makeReminderSchema,
  reminderDefaults,
  type ReminderValues,
} from './reminder.types';

interface Props {
  onSubmit: (values: ReminderValues) => Promise<void>;
  /** Prefill (a post-call follow-up). */
  initialTitle?: string;
  error?: string | null;
}

/** A reminder on a lead — the portal's Reminders tab, with one-tap due times. */
export function ReminderForm({ onSubmit, initialTitle, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<ReminderValues>(makeReminderSchema(t)), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<ReminderValues, any, ReminderValues>({
    defaultValues: { ...reminderDefaults, title: initialTitle ?? '' },
    resolver,
    mode: 'onTouched',
  });
  const { field: due } = useController({ control, name: 'due' });
  return (
    <YStack gap="$3">
      <TextField
        control={control}
        name="title"
        label={t('crmApp.reminder.titleLabel')}
        testID="reminder-title"
      />
      <YStack gap="$2">
        <Label fontWeight="600">{t('crmApp.reminder.due')}</Label>
        <XStack flexWrap="wrap" gap="$2" role="radiogroup" aria-label={t('crmApp.reminder.due')}>
          {DUE_CHOICES.map((choice) => (
            <DuncitButton
              key={choice}
              label={t(`crmApp.reminder.in.${choice}`)}
              onPress={() => due.onChange(choice)}
              variant={due.value === choice ? 'solid' : 'outline'}
              size="sm"
              testID={`reminder-due-${choice}`}
            />
          ))}
        </XStack>
      </YStack>
      <TextField
        control={control}
        name="notes"
        label={t('crmApp.reminder.notes')}
        multiline
        testID="reminder-notes"
      />
      <DuncitButton
        label={t('crmApp.reminder.save')}
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
        fullWidth
        testID="reminder-save"
      />
      {error ? (
        <Text color="$danger" role="alert">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
