import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { makeVenueChatEditSchema } from '@duncit/forms/schemas';
import type { LineEditFormProps, LineEditValues } from './line-edit.types';

/**
 * The author's text line, rewritten: one box, starting from what it says now,
 * held to the shared rule (something to say, within the server's bound). The
 * dialog around it owns the buttons; this form is submitted by its id.
 */
export default function LineEditForm({ formId, defaultValues, onSubmit }: Readonly<LineEditFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenueChatEditSchema(t), [t]);
  const { control, handleSubmit } = useForm<LineEditValues>({ resolver: zodResolver(schema), defaultValues });

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(async (values) => onSubmit({ text: values.text.trim() }))}>
      <RhfTextField control={control} name="text" multiline minRows={2} autoFocus label={t('availability.offers.chat.editTitle')} />
    </form>
  );
}
