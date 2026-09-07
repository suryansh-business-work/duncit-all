import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import ExpenseClaimFields from './ExpenseClaimFields';
import { expenseClaimSchema, toFormValues } from './expense-claim.schema';
import type { ExpenseClaimFormProps, ExpenseClaimFormValues } from './expense-claim.types';

/** File or edit one out-of-pocket spend an employee is claiming back. */
export default function ExpenseClaimForm({
  claim,
  currency,
  busy,
  errorMessage,
  onCancel,
  onSubmit,
}: Readonly<ExpenseClaimFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<
    ExpenseClaimFormValues,
    unknown,
    ExpenseClaimFormValues
  >({
    defaultValues: toFormValues(claim),
    resolver: zodResolver(expenseClaimSchema(t)) as unknown as Resolver<
      ExpenseClaimFormValues,
      unknown,
      ExpenseClaimFormValues
    >,
  });

  // The dialog keeps ONE form mounted and swaps which claim it is editing, so
  // the values have to follow the row rather than the mount.
  useEffect(() => {
    reset(toFormValues(claim));
  }, [claim, reset]);

  const submitLabel = claim ? t('shell.common.save') : t('employeeExpense.mine.fileClaim');

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
      <Stack spacing={2}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <ExpenseClaimFields control={control} currency={currency} />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={busy}>
            {busy ? t('shell.common.saving') : submitLabel}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
