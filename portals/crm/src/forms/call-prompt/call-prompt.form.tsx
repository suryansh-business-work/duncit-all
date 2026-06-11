import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { callPromptSchema, callPromptDefaults } from './call-prompt.schema';
import { LANGUAGE_OPTIONS, type CallPromptFormProps, type CallPromptFormValues } from './call-prompt.types';

/**
 * Create / edit form for a Static Content prompt. RHF + Zod with inline hints,
 * validation and error handling; MUI inputs only. The `context` field is the
 * reusable context block the AI agent speaks in during an AI Call.
 */
export default function CallPromptForm({ defaultValues, submitting, submitLabel = 'Save', onSubmit, onCancel }: Readonly<CallPromptFormProps>) {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CallPromptFormValues>({
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
              label="Name"
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
              label="Description"
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
              label="Language"
              fullWidth
              error={!!errors.language}
              helperText={errors.language?.message ?? 'Language the AI agent speaks'}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
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
              label="Static content"
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
              label="Active"
            />
          )}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {onCancel && (
            <Button onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="contained" disabled={submitting || !isValid}>
            {submitting ? 'Saving…' : submitLabel}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
