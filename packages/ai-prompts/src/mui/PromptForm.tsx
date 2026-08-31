import { useEffect, useMemo } from 'react';
import { Controller, useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Chip, FormControlLabel, Stack, Switch } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { usePromptCopy } from '../i18n/useCopy';
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
  submitLabel,
  code = false,
  editing = false,
  variables = [],
  onSubmit,
  onCancel,
  onContentChange,
}: Readonly<PromptFormProps>) {
  const copy = usePromptCopy();
  const schema = useMemo(() => promptFormSchema(variables), [variables]);
  const { control, handleSubmit, watch, formState } = useForm<PromptFormValues, any, PromptFormValues>({
    defaultValues: { ...promptInitialValues, ...initialValues },
    resolver: zodResolver(schema) as unknown as Resolver<PromptFormValues, any, PromptFormValues>,
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
  const keyHint = code ? copy.hints.keyCode : copy.hints.keyAi;

  return (
    <form noValidate data-testid="prompt-form" onSubmit={submit}>
      <Stack spacing={1.5} sx={{ mt: 0.5 }}>
        <RhfTextField
          control={control}
          name="name"
          label={copy.fields.name}
          required
          disabled={code}
          hint={code ? copy.hints.nameCode : copy.hints.nameAi}
        />
        <RhfTextField
          control={control}
          name="key"
          label={copy.fields.key}
          disabled={code || editing}
          hint={keyHint}
        />
        <RhfTextField
          control={control}
          name="description"
          label={copy.fields.description}
          hint={copy.hints.description}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField
            control={control}
            name="category"
            label={copy.fields.category}
            disabled={code}
            hint={copy.hints.category}
          />
          <RhfTextField
            control={control}
            name="target_model"
            label={copy.fields.model}
            hint={copy.hints.model}
          />
        </Stack>
        <RhfTextField
          control={control}
          name="content"
          label={copy.fields.content}
          required
          multiline
          minRows={10}
          hint={copy.hints.content}
        />
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
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
                  label={copy.fields.active}
                />
              )}
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1} sx={{
          justifyContent: "flex-end"
        }}>
          {onCancel && (
            <DuncitButton onClick={onCancel} disabled={submitting}>
              {copy.cancel}
            </DuncitButton>
          )}
          <DuncitButton type="submit" variant="contained" disabled={submitting || !formState.isValid}>
            {submitting ? copy.saving : (submitLabel ?? copy.saveChanges)}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
