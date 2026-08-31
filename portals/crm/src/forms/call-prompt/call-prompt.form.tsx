import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { callPromptSchema, callPromptDefaults } from './call-prompt.schema';
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

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CallPromptFormValues, any, CallPromptFormValues>({
    resolver: zodResolver(callPromptSchema),
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
              helperText={errors.name?.message ?? 'A short label, e.g. "Venue onboarding pitch"'}
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
              helperText={errors.description?.message ?? 'Optional — what this prompt is for'}
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
              helperText={errors.language?.message ?? 'Language the AI agent speaks'}
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
              helperText={errors.context?.message ?? 'The context/script the AI agent uses on the call'}
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
          <DuncitButton type="submit" variant="contained" disabled={submitting || !isValid}>
            {submitting ? 'Saving…' : submitLabelText}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
