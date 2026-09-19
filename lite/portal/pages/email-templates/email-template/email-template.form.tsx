import { useEffect, useMemo, useRef } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, TextField } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { usePortalT } from '../../../../shared/i18n';
import { FormDialog } from '../../../components/FormDialog';
import { RhfSwitch } from '../../../components/RhfSwitch';
import type { LiteEmailTemplate } from '../../../graphql/email';
import { braced, makeEmailTemplateSchema, templateValuesFrom, type EmailTemplateValues } from './email-template.types';
import { VarChips } from './VarChips';

interface Props {
  template: LiteEmailTemplate | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: EmailTemplateValues) => Promise<void>;
}

const EMPTY: EmailTemplateValues = { subject: '', body: '', enabled: true };

export function EmailTemplateForm({ template, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeEmailTemplateSchema(t), [t]);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const { control, handleSubmit, reset, getValues, setValue } = useForm<EmailTemplateValues, unknown, EmailTemplateValues>({
    defaultValues: EMPTY,
    resolver: zodResolver(schema) as Resolver<EmailTemplateValues, unknown, EmailTemplateValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (template) reset(templateValuesFrom(template));
  }, [template, reset]);

  /** Drops `{name}` where the cursor is (or at the end) and puts the cursor after it. */
  const insertVar = (name: string) => {
    const token = braced(name);
    const box = bodyRef.current;
    const current = getValues('body');
    const start = box?.selectionStart ?? current.length;
    const end = box?.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
    setValue('body', next, { shouldDirty: true, shouldValidate: true });
    const caret = start + token.length;
    globalThis.requestAnimationFrame(() => {
      box?.focus();
      box?.setSelectionRange(caret, caret);
    });
  };

  return (
    <FormDialog
      open={Boolean(template)}
      title={t('litePortal.emailTemplates.editTitle', { vars: { name: template?.name ?? '' } })}
      onSubmit={handleSubmit(onSubmit)}
      onClose={onClose}
      busy={busy}
      testId="email-template-dialog"
    >
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="subject"
          label={t('litePortal.emailTemplates.subject')}
          hint={t('litePortal.emailTemplates.subjectHint')}
          required
          disabled={busy}
          slotProps={{ htmlInput: { 'data-testid': 'template-subject' } }}
        />
        <Controller
          control={control}
          name="body"
          render={({ field, fieldState }) => (
            <TextField
              label={t('litePortal.emailTemplates.body')}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={(element: HTMLTextAreaElement | null) => {
                field.ref(element);
                bodyRef.current = element;
              }}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? t('litePortal.emailTemplates.bodyHint')}
              required
              disabled={busy}
              fullWidth
              multiline
              minRows={8}
              slotProps={{ htmlInput: { 'data-testid': 'template-body' } }}
            />
          )}
        />
        <VarChips vars={template?.vars ?? []} disabled={busy} onInsert={insertVar} />
        <RhfSwitch control={control} name="enabled" label={t('litePortal.emailTemplates.enabled')} hint={t('litePortal.emailTemplates.enabledHint')} disabled={busy} testId="template-enabled" />
      </Stack>
    </FormDialog>
  );
}
