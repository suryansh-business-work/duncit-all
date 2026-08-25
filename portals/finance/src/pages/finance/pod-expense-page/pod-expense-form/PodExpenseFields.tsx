import { Controller, type Control } from 'react-hook-form';
import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';
import { POD_EXPENSE_CATEGORIES, POD_EXPENSE_PAYMENT_METHODS, labelize } from '../queries';
import type { PodExpenseFormValues } from './pod-expense.types';

type FormControl = Control<PodExpenseFormValues>;
type TextName = 'vendor_name' | 'bill_number' | 'reference' | 'description';

/** Plain text input wired to react-hook-form — the four fields that are just text. */
function TextControl({
  control,
  name,
  label,
  multiline,
}: Readonly<{ control: FormControl; name: TextName; label: string; multiline?: boolean }>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          fullWidth
          label={label}
          multiline={multiline}
          minRows={multiline ? 2 : undefined}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? ' '}
        />
      )}
    />
  );
}

/** Dropdown of CONSTANT_CASE codes, shown title-cased. */
function SelectControl({
  control,
  name,
  label,
  options,
}: Readonly<{
  control: FormControl;
  name: 'category' | 'payment_method';
  label: string;
  options: readonly string[];
}>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          select
          fullWidth
          label={label}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? ' '}
        >
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {labelize(option)}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}

/** Every input of the pod-expense form, in the order Finance fills them in. */
export default function PodExpenseFields({
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
            label={t('finance.podExpense.spendDate')}
            value={field.value ?? null}
            onChange={field.onChange}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!fieldState.error,
                helperText: fieldState.error?.message ?? ' ',
              }}}
          />
        )}
      />

      <SelectControl
        control={control}
        name="category"
        label={t('finance.expenseManagement.category')}
        options={POD_EXPENSE_CATEGORIES}
      />

      <Controller
        control={control}
        name="amount"
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            type="number"
            fullWidth
            label={t('finance.common.amount')}
            value={Number.isFinite(field.value) ? field.value : ''}
            onChange={(event) =>
              field.onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))
            }
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? ' '}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
              }
            }}
          />
        )}
      />

      <TextControl
        control={control}
        name="vendor_name"
        label={t('finance.expenseManagement.vendorPayee')}
      />

      <SelectControl
        control={control}
        name="payment_method"
        label={t('finance.expenseManagement.paymentMethod')}
        options={POD_EXPENSE_PAYMENT_METHODS}
      />

      <TextControl
        control={control}
        name="bill_number"
        label={t('finance.podExpense.billNumber')}
      />

      <Controller
        control={control}
        name="bill_url"
        render={({ field, fieldState }) => (
          <SingleImageUploadField
            variant="url-button"
            label={t('finance.podExpense.billUpload')}
            helperText={fieldState.error?.message ?? t('finance.podExpense.billUploadHint')}
            error={!!fieldState.error}
            value={field.value}
            onChange={field.onChange}
            folder="/pod-expenses"
            accept="image/*,.pdf"
            maxBytes={null}
            buttonLabel={t('finance.podExpense.upload')}
          />
        )}
      />

      <TextControl
        control={control}
        name="reference"
        label={t('finance.expenseManagement.referenceTxnId')}
      />

      <TextControl
        control={control}
        name="description"
        label={t('shell.common.description')}
        multiline
      />
    </Stack>
  );
}
