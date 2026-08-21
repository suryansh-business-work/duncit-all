import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Chip, FormControlLabel, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { PROMPT_COPY } from '../copy';
import { estimateTokens } from '../render';
import { promptFormSchema, promptInitialValues, type PromptFormValues } from '../schema';
import type { PromptVariable } from '../types';

export interface PromptFormProps {
  initialValues?: Partial<PromptFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  /**
   * A code prompt's identity belongs to the server catalogue — the next boot
   * overwrites whatever a portal wrote there — so only the body, the note and
   * the target model are editable.
   */
  code?: boolean;
  /** Editing an existing row: the key is fixed, because the feed addresses it. */
  editing?: boolean;
  /** Placeholders this prompt must keep, checked by the schema as you type. */
  variables?: readonly PromptVariable[];
  onSubmit: (values: PromptFormValues) => Promise<void> | void;
  onCancel?: () => void;
  /** Reports the live body up, so the preview beside the form stays in step. */
  onContentChange?: (content: string) => void;
}

/**
 * Create / edit a Prompt Library entry (RHF + Zod, rule 30). The token size of
 * `content` is shown live with the same estimator the server uses, so an author
 * sees the budget as they type rather than after saving.
 */
export function PromptForm({
  initialValues,
  submitting,
  submitLabel = 'Save',
  code = false,
  editing = false,
  variables = [],
  onSubmit,
  onCancel,
  onContentChange,
}: Readonly<PromptFormProps>) {
  const schema = useMemo(() => promptFormSchema(variables), [variables]);
  const { control, handleSubmit, watch, formState } = useForm<PromptFormValues>({
    defaultValues: { ...promptInitialValues, ...initialValues },
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const content = watch('content');
  // Reported in an effect, not during render: the preview lives in the parent,
  // and a parent setState raised mid-render is a React warning and a re-render
  // loop waiting to happen.
  useEffect(() => {
    onContentChange?.(content);
  }, [content, onContentChange]);

  const submit = handleSubmit((values) => onSubmit(values));
  const keyHint = code ? PROMPT_COPY.hints.keyCode : PROMPT_COPY.hints.keyAi;

  return (
    <form noValidate data-testid="prompt-form" onSubmit={submit}>
      <Stack spacing={1.5} sx={{ mt: 0.5 }}>
        <RhfTextField
          control={control}
          name="name"
          label={PROMPT_COPY.fields.name}
          required
          disabled={code}
          hint={code ? PROMPT_COPY.hints.nameCode : PROMPT_COPY.hints.nameAi}
        />
        <RhfTextField
          control={control}
          name="key"
          label={PROMPT_COPY.fields.key}
          disabled={code || editing}
          hint={keyHint}
        />
        <RhfTextField
          control={control}
          name="description"
          label={PROMPT_COPY.fields.description}
          hint={PROMPT_COPY.hints.description}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField
            control={control}
            name="category"
            label={PROMPT_COPY.fields.category}
            disabled={code}
            hint={PROMPT_COPY.hints.category}
          />
          <RhfTextField
            control={control}
            name="target_model"
            label={PROMPT_COPY.fields.model}
            hint={PROMPT_COPY.hints.model}
          />
        </Stack>
        <RhfTextField
          control={control}
          name="content"
          label={PROMPT_COPY.fields.content}
          required
          multiline
          minRows={10}
          hint={PROMPT_COPY.hints.content}
        />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={`≈ ${estimateTokens(content)} tokens`}
            data-testid="prompt-token-count"
          />
          {!code && (
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      name="is_active"
                    />
                  }
                  label={PROMPT_COPY.fields.active}
                />
              )}
            />
          )}
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
