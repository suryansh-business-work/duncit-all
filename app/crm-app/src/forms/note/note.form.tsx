import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { makeNoteSchema, noteDefaults, type NoteValues } from './note.types';

interface Props {
  onSubmit: (values: NoteValues) => Promise<void>;
  error?: string | null;
}

/** Add a note to a lead's timeline (the portal's Manual Logs). */
export function NoteForm({ onSubmit, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<NoteValues>(makeNoteSchema(t)), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<NoteValues, any, NoteValues>({
    defaultValues: noteDefaults,
    resolver,
    mode: 'onTouched',
  });
  return (
    <YStack gap="$3">
      <TextField
        control={control}
        name="summary"
        label={t('crmApp.note.summary')}
        hint={t('crmApp.note.summaryHint')}
        testID="note-summary"
      />
      <TextField
        control={control}
        name="body"
        label={t('crmApp.note.body')}
        multiline
        testID="note-body"
      />
      <DuncitButton
        label={t('crmApp.note.save')}
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
        fullWidth
        testID="note-save"
      />
      {error ? (
        <Text color="$danger" role="alert">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
