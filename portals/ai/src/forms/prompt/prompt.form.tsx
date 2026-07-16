import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Chip, FormControlLabel, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { estimateTokens } from '../../utils/estimate-tokens';
import { promptInitialValues, promptSchema, type PromptFormProps, type PromptFormValues } from './prompt.types';

export { promptSchema };

/**
 * Create / edit a Prompt Library entry. The token size of `content` is shown live
 * (same estimator the server uses) so authors see the budget as they type.
 */
export default function PromptForm({
  initialValues,
  submitting,
  submitLabel = 'Save',
  onSubmit,
  onCancel,
}: Readonly<PromptFormProps>) {
  const { control, handleSubmit, watch, formState } = useForm<PromptFormValues>({
    defaultValues: { ...promptInitialValues, ...initialValues },
    resolver: zodResolver(promptSchema),
    mode: 'onChange',
  });

  const content = watch('content');

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate data-testid="prompt-form" onSubmit={submit}>
      <Stack spacing={1.5} sx={{ mt: 0.5 }}>
        <RhfTextField control={control} name="name" label="Name" required hint='A short label, e.g. "Article summarizer"' />
        <RhfTextField control={control} name="description" label="Description" hint="Optional — what this prompt is for" />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField control={control} name="category" label="Category" hint="e.g. Summarization, Classification" />
          <RhfTextField control={control} name="target_model" label="Model" hint="Optional target model, e.g. gpt-4o-mini" />
        </Stack>
        <RhfTextField
          control={control}
          name="content"
          label="Prompt content"
          required
          multiline
          minRows={6}
          hint="The prompt body sent to the model"
        />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={`≈ ${estimateTokens(content)} tokens`}
            data-testid="prompt-token-count"
          />
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} name="is_active" />}
                label="Active"
              />
            )}
          />
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {onCancel && (
            <Button onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="contained" disabled={submitting || !formState.isValid}>
            {submitting ? 'Saving…' : submitLabel}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
