import { useEffect } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { expenseOptionSchema, toFormValues, toOptionKey } from './expense-option.schema';
import type { ExpenseOptionFormProps, ExpenseOptionFormValues } from './expense-option.types';

/** Add or edit one row of one Expense dropdown. */
export default function ExpenseOptionForm({
  kind,
  option,
  entitySources,
  busy,
  errorMessage,
  onCancel,
  onSubmit,
}: Readonly<ExpenseOptionFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, watch } = useForm<
    ExpenseOptionFormValues,
    unknown,
    ExpenseOptionFormValues
  >({
    defaultValues: toFormValues(option),
    resolver: zodResolver(expenseOptionSchema(t)) as unknown as Resolver<
      ExpenseOptionFormValues,
      unknown,
      ExpenseOptionFormValues
    >,
  });

  // One dialog is kept mounted and swaps which row it edits.
  useEffect(() => {
    reset(toFormValues(option));
  }, [option, reset]);

  const editing = !!option;
  const keyPreview = toOptionKey(watch('key') ?? '');
  const showSource = kind === 'RELATED_FROM_TYPE';

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
      <Stack spacing={1.5}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <RhfTextField
          control={control}
          name="label"
          label={t('finance.expenseConfig.displayName')}
          hint={t('finance.expenseConfig.displayNameHint')}
        />

        <RhfTextField
          control={control}
          name="key"
          label={t('finance.expenseConfig.storedKey')}
          disabled={editing}
          hint={
            editing
              ? t('finance.expenseConfig.keyLocked')
              : t('finance.expenseConfig.keyPreview', { vars: { key: keyPreview } })
          }
        />

        {showSource && (
          <Controller
            control={control}
            name="entity_source"
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label={t('finance.expenseConfig.entitySource')}
                helperText={t('finance.expenseConfig.entitySourceHint')}
              >
                <MenuItem value="">{t('finance.expenseConfig.noEntityList')}</MenuItem>
                {entitySources.map((source) => (
                  <MenuItem key={source} value={source}>
                    {source}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        )}

        <Controller
          control={control}
          name="is_active"
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
              }
              label={t('finance.expenseConfig.offeredOnTheForm')}
            />
          )}
        />

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={busy}>
            {busy ? t('shell.common.saving') : t('shell.common.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
