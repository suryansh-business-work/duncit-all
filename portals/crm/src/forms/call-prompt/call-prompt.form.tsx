import { useMemo } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { makeCallPromptSchema, callPromptDefaults } from './call-prompt.schema';
import {
  languageOptions,
  type CallPromptFormProps,
  type CallPromptFormValues,
} from './call-prompt.types';
import { useTranslation } from '@duncit/shell';

/**
 * Create / edit form for a Static Content prompt. RHF + Zod with inline hints,
 * validation and error handling; MUI inputs only. The `context` field is the
 * reusable context block the AI agent speaks in during an AI Call.
 */
export default function CallPromptForm({ defaultValues, submitting, submitLabel, onSubmit, onCancel }: Readonly<CallPromptFormProps>) {
  const { t } = useTranslation();
  const submitLabelText = submitLabel ?? t('shell.common.save');
  const schema = useMemo(() => makeCallPromptSchema(t), [t]);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CallPromptFormValues, any, CallPromptFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<CallPromptFormValues, any, CallPromptFormValues>,
    mode: 'onChange',
    defaultValues: { ...callPromptDefaults, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="call-prompt-form">
      <Stack spacing={2} sx={{ mt: 0.5 }}>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              label={t('shell.common.name')}
              required
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message ?? t('crm.callPrompts.nameHint')}
            />
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              label={t('shell.common.description')}
              fullWidth
              error={!!errors.description}
              helperText={errors.description?.message ?? t('crm.callPrompts.descriptionHint')}
            />
          )}
        />
        <Controller
          name="language"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              size="small"
              label={t('crm.common.language')}
              fullWidth
              error={!!errors.language}
              helperText={errors.language?.message ?? t('crm.callPrompts.languageHint')}
            >
              {languageOptions(t).map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="context"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('crm.forms.staticContent')}
              required
              fullWidth
              multiline
              minRows={6}
              error={!!errors.context}
              helperText={errors.context?.message ?? t('crm.callPrompts.contextHint')}
            />
          )}
        />
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
              label={t('crm.common.active')}
            />
          )}
        />
        <Stack direction="row" spacing={1} sx={{
          justifyContent: "flex-end"
        }}>
          {onCancel && (
            <DuncitButton onClick={onCancel} disabled={submitting}>
              {t('shell.common.cancel')}
            </DuncitButton>
          )}
          <DuncitButton type="submit" variant="contained" loading={submitting} disabled={!isValid}>
            {submitting ? t('shell.common.saving') : submitLabelText}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
