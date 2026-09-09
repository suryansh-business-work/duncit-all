import { useEffect } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import ExpenseSpendFields from './ExpenseSpendFields';
import ExpenseCompensationFields, { previewStatus } from './ExpenseCompensationFields';
import { expenseSchema, toFormValues } from './expense.schema';
import type { ExpenseFormProps, ExpenseFormValues } from './expense.types';

/** Record or edit one Duncit expense, with what it was for and how it comes back. */
export default function ExpenseForm({
  expense,
  currency,
  busy,
  errorMessage,
  onCancel,
  onSubmit,
}: Readonly<ExpenseFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, setValue } = useForm<
    ExpenseFormValues,
    unknown,
    ExpenseFormValues
  >({
    defaultValues: toFormValues(expense),
    resolver: zodResolver(expenseSchema(t)) as unknown as Resolver<
      ExpenseFormValues,
      unknown,
      ExpenseFormValues
    >,
  });

  // The drawer keeps ONE form mounted and swaps which expense it edits, so the
  // values have to follow the row rather than the mount.
  useEffect(() => {
    reset(toFormValues(expense));
  }, [expense, reset]);

  // Three watched values, because three controls depend on them: the entity
  // picker on the type, and the derived-status chip on the two amounts.
  const typeKey = useWatch({ control, name: 'related_from_type' }) ?? '';
  const amount = useWatch({ control, name: 'amount' }) ?? '';
  const compensated = useWatch({ control, name: 'compensated_amount' }) ?? '';
  const rejected = useWatch({ control, name: 'compensation_rejected' }) ?? false;

  const status = previewStatus(Number(amount || 0), Number(compensated || 0), rejected);
  const submitLabel = expense ? t('shell.common.save') : t('finance.expenseManagement.addExpense');

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
      <Stack spacing={2}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <ExpenseSpendFields
          control={control}
          currency={currency}
          typeKey={typeKey}
          relatedName={expense?.related_from_name ?? ''}
          // A different type is a different collection, so the entity chosen
          // under the old one is cleared rather than left pointing nowhere.
          onTypeChange={() => setValue('related_from_id', '')}
        />

        <Divider />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          {t('finance.expenseConfig.compensationHeading')}
        </Typography>
        <ExpenseCompensationFields control={control} currency={currency} status={status} />

        {/* Sticky, because this form is two sections tall: the spend and the
            compensation. On a drawer that scrolls, a Save button at the end of
            it is a Save button somebody has to go looking for. */}
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            gap: 1,
            justifyContent: 'flex-end',
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            py: 1.5,
          }}
        >
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy}>
            {busy ? t('shell.common.saving') : submitLabel}
          </DuncitButton>
        </Box>
      </Stack>
    </form>
  );
}
