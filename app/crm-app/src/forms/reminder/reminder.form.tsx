import { useMemo } from 'react';
import { useController, useForm } from 'react-hook-form';
import { Label, Text, XStack, YStack } from 'tamagui';

import { DateField } from '@/components/DateField';
import { DuncitButton } from '@/components/DuncitButton';
import { SelectChip } from '@/components/mobile/SelectChip';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  CUSTOM_DUE,
  DUE_CHOICES,
  makeReminderSchema,
  reminderDefaults,
  type ReminderValues,
} from './reminder.types';

interface Props {
  onSubmit: (values: ReminderValues) => Promise<void>;
  /** Prefill (a post-call follow-up). */
  initialTitle?: string;
  /** Start from these values (editing a reminder: its title, due time and notes). */
  initialValues?: Partial<ReminderValues>;
  /** The save button's words; "Save reminder" by default. */
  submitLabel?: string;
  error?: string | null;
}

/**
 * A reminder — the portal's reminder dialog: a title, when it is due (a
 * one-tap quick choice, or any date and time on the phone's picker) and notes.
 */
export function ReminderForm({
  onSubmit,
  initialTitle,
  initialValues,
  submitLabel,
  error,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<ReminderValues>(makeReminderSchema(t)), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<ReminderValues, any, ReminderValues>({
    defaultValues: { ...reminderDefaults, title: initialTitle ?? '', ...initialValues },
    resolver,
    mode: 'onTouched',
  });
  const { field: due } = useController({ control, name: 'due' });
  const { field: at, fieldState: atState } = useController({ control, name: 'at' });
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
            <SelectChip
              key={choice}
              label={t(`crmApp.reminder.in.${choice}`)}
              onPress={() => due.onChange(choice)}
              selected={due.value === choice}
              testID={`reminder-due-${choice}`}
            />
          ))}
        </XStack>
        <DateField
          label={t('crm.components.dueDateAndTime')}
          mode="datetime"
          value={due.value === CUSTOM_DUE ? (at.value ?? null) : null}
          onChange={(picked) => {
            at.onChange(picked);
            due.onChange(CUSTOM_DUE);
          }}
          placeholder={t('crmApp.reminder.pickExact')}
          error={atState.error?.message}
          testID="reminder-due-at"
        />
      </YStack>
      <TextField
        control={control}
        name="notes"
        label={t('crmApp.reminder.notes')}
        multiline
        testID="reminder-notes"
      />
      <DuncitButton
        label={submitLabel ?? t('crmApp.reminder.save')}
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
