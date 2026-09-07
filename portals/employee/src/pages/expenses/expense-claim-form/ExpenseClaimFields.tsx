import { Controller, type Control } from 'react-hook-form';
import { InputAdornment, MenuItem, Stack } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { RhfTextField } from '@duncit/forms';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';
import {
  EMPLOYEE_EXPENSE_CATEGORIES,
  EMPLOYEE_EXPENSE_PAYMENT_METHODS,
} from '@duncit/utils';
import { labelize } from '../queries';
import type { ExpenseClaimFormValues } from './expense-claim.types';

type FormControl = Control<ExpenseClaimFormValues>;

/** CONSTANT_CASE codes as dropdown items, shown title-cased. */
const options = (values: readonly string[]) =>
  values.map((value) => (
    <MenuItem key={value} value={value}>
      {labelize(value)}
    </MenuItem>
  ));

/** Every input of the claim form, in the order an employee fills them in. */
export default function ExpenseClaimFields({
  control,
  currency,
}: Readonly<{ control: FormControl; currency: string }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <Controller
        control={control}
        name="date"
        render={({ field, fieldState }) => (
          <DatePicker
            label={t('employeeExpense.form.spendDate')}
            value={field.value ?? null}
            onChange={field.onChange}
            disableFuture
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!fieldState.error,
                helperText: fieldState.error?.message ?? ' ',
              },
            }}
          />
        )}
      />

      <RhfTextField
        control={control}
        name="category"
        select
        label={t('employeeExpense.form.category')}
      >
        {options(EMPLOYEE_EXPENSE_CATEGORIES)}
      </RhfTextField>

      <RhfTextField
        control={control}
        name="amount"
        type="number"
        label={t('employeeExpense.form.amount')}
        slotProps={{ input: { startAdornment: <InputAdornment position="start">{currency}</InputAdornment> } }}
      />

      <RhfTextField
        control={control}
        name="merchant"
        label={t('employeeExpense.form.merchant')}
      />

      <RhfTextField
        control={control}
        name="payment_method"
        select
        label={t('employeeExpense.form.paymentMethod')}
      >
        {options(EMPLOYEE_EXPENSE_PAYMENT_METHODS)}
      </RhfTextField>

      <RhfTextField
        control={control}
        name="bill_number"
        label={t('employeeExpense.form.billNumber')}
      />

      <Controller
        control={control}
        name="bill_url"
        render={({ field, fieldState }) => (
          <SingleImageUploadField
            variant="url-button"
            label={t('employeeExpense.form.billUpload')}
            helperText={fieldState.error?.message ?? t('employeeExpense.form.billUploadHint')}
            error={!!fieldState.error}
            value={field.value}
            onChange={field.onChange}
            folder="/employee-expenses"
            accept="image/*,.pdf"
            maxBytes={null}
            buttonLabel={t('employeeExpense.form.upload')}
          />
        )}
      />

      <RhfTextField
        control={control}
        name="reference"
        label={t('employeeExpense.form.reference')}
      />

      <RhfTextField
        control={control}
        name="description"
        multiline
        minRows={2}
        label={t('employeeExpense.form.description')}
      />
    </Stack>
  );
}
