import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import PodExpenseFields from './PodExpenseFields';
import { podExpenseSchema, toFormValues } from './pod-expense.schema';
import type { PodExpenseFormProps, PodExpenseFormValues } from './pod-expense.types';

/** Record or edit one thing Duncit paid for to put a pod on. */
export default function PodExpenseForm({
  expense,
  currency,
  busy,
  errorMessage,
  onCancel,
  onSubmit,
}: Readonly<PodExpenseFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<PodExpenseFormValues>({
    defaultValues: toFormValues(expense),
    resolver: zodResolver(podExpenseSchema(t)),
  });

  // The drawer keeps ONE form mounted and swaps which entry it is editing, so
  // the values have to follow the row rather than the mount.
  useEffect(() => {
    reset(toFormValues(expense));
  }, [expense, reset]);

  const submitLabel = expense ? t('shell.common.save') : t('finance.podExpense.addExpense');

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
      <Stack spacing={2}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <PodExpenseFields control={control} currency={currency} />
        <Stack direction="row" spacing={1} sx={{
          justifyContent: "flex-end"
        }}>
          <Button onClick={onCancel} disabled={busy}>
            {t('shell.common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? t('shell.common.saving') : submitLabel}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
