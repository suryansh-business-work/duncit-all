import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormHelperText, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/shell';
import { CASE_IMAGE_FOLDER } from '../../rich-section/rich-section.types';
import { commentSchema, type CommentValues } from './comment.types';

interface Props {
  initial?: string;
  submitLabel: string;
  saving: boolean;
  /** Resolves true once saved, so a new-comment box clears. */
  onSubmit: (html: string) => Promise<boolean>;
  /** Editing an existing comment can be abandoned; the new-comment box cannot. */
  onCancel?: () => void;
}

/** Write a comment (or rewrite your own) in the shared rich-text editor. */
export default function CommentForm({ initial = '', submitLabel, saving, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => commentSchema(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<CommentValues>({
    resolver: zodResolver(schema),
    defaultValues: { body: initial },
  });

  const submit = handleSubmit(async (values) => {
    if ((await onSubmit(values.body)) && !onCancel) reset({ body: '' });
  });

  return (
    <Stack component="form" spacing={1} noValidate onSubmit={submit}>
      <Controller
        control={control}
        name="body"
        render={({ field, fieldState }) => (
          <>
            <DuncitRichTextInput
              value={field.value}
              onChange={(html) => field.onChange(html)}
              ariaLabel={t('testsManual.comments.editorLabel')}
              placeholder={t('testsManual.comments.placeholder')}
              imageFolder={CASE_IMAGE_FOLDER}
              compact
              disabled={saving}
            />
            {fieldState.error ? <FormHelperText error>{fieldState.error.message}</FormHelperText> : null}
          </>
        )}
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        {onCancel ? (
          <DuncitButton onClick={onCancel} disabled={saving}>
            {t('shell.common.cancel')}
          </DuncitButton>
        ) : null}
        <DuncitButton type="submit" variant="contained" loading={saving} disabled={!formState.isDirty}>
          {submitLabel}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
