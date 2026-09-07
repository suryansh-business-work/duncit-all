import { Controller, type Control } from 'react-hook-form';
import { InputAdornment, Stack } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { RhfTextField } from '@duncit/forms';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';
import { ExpenseOptionSelect, RelatedEntityPicker } from '../../expense-config';
import type { ExpenseFormValues } from './expense.types';

type FormControl = Control<ExpenseFormValues>;

/**
 * What the money was, and what it was for.
 *
 * "Expense Related From" is two controls that move together: the TYPE picks
 * which list the entity picker searches, so changing it clears the entity —
 * a venue id left behind under Host would be an expense attributed to a row
 * that does not exist in the collection its type names.
 */
export default function ExpenseSpendFields({
  control,
  currency,
  typeKey,
  relatedName,
  onTypeChange,
}: Readonly<{
  control: FormControl;
  currency: string;
  /** The chosen Related From type, watched by the parent form. */
  typeKey: string;
  /** The name the expense already stored, shown before the picker answers. */
  relatedName: string;
  onTypeChange: () => void;
}>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <Controller
        control={control}
        name="date"
        render={({ field, fieldState }) => (
          <DatePicker
            label={t('finance.common.date')}
            value={field.value ?? null}
            onChange={field.onChange}
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

      <Controller
        control={control}
        name="category"
        render={({ field, fieldState }) => (
          <ExpenseOptionSelect
            kind="CATEGORY"
            label={t('finance.expenseManagement.category')}
            value={field.value}
            onChange={field.onChange}
            helperText={fieldState.error?.message ?? ' '}
          />
        )}
      />

      <RhfTextField
        control={control}
        name="amount"
        type="number"
        label={t('finance.common.amount')}
        slotProps={{
          input: { startAdornment: <InputAdornment position="start">{currency}</InputAdornment> },
        }}
      />

      <Controller
        control={control}
        name="related_from_type"
        render={({ field }) => (
          <ExpenseOptionSelect
            kind="RELATED_FROM_TYPE"
            label={t('finance.expenseConfig.relatedFrom')}
            value={field.value}
            onChange={(key) => {
              field.onChange(key);
              onTypeChange();
            }}
            allowEmpty
            emptyLabel={t('finance.expenseConfig.notAttributed')}
            helperText={t('finance.expenseConfig.relatedFromHint')}
          />
        )}
      />

      <Controller
        control={control}
        name="related_from_id"
        render={({ field, fieldState }) => (
          <RelatedEntityPicker
            typeKey={typeKey}
            value={field.value}
            valueName={relatedName}
            onChange={field.onChange}
            label={t('finance.expenseConfig.relatedEntity')}
            helperText={fieldState.error?.message ?? ' '}
          />
        )}
      />

      <RhfTextField
        control={control}
        name="vendor_name"
        label={t('finance.expenseManagement.vendorPayee')}
      />

      <RhfTextField
        control={control}
        name="paid_by"
        label={t('finance.expenseConfig.paidBy')}
        hint={t('finance.expenseConfig.paidByHint')}
      />

      <Controller
        control={control}
        name="payment_method"
        render={({ field, fieldState }) => (
          <ExpenseOptionSelect
            kind="PAYMENT_METHOD"
            label={t('finance.expenseManagement.paymentMethod')}
            value={field.value}
            onChange={field.onChange}
            helperText={fieldState.error?.message ?? ' '}
          />
        )}
      />

      <RhfTextField
        control={control}
        name="reference"
        label={t('finance.expenseManagement.referenceTxnId')}
      />

      <Controller
        control={control}
        name="attachment_url"
        render={({ field, fieldState }) => (
          <SingleImageUploadField
            variant="url-button"
            label={t('finance.expenseManagement.receiptAttachmentUrl')}
            helperText={fieldState.error?.message ?? t('finance.expenseManagement.receiptHint')}
            error={!!fieldState.error}
            value={field.value}
            onChange={field.onChange}
            folder="/expenses"
            accept="image/*,.pdf"
            maxBytes={null}
            buttonLabel={t('finance.expenseConfig.upload')}
          />
        )}
      />

      <RhfTextField
        control={control}
        name="description"
        multiline
        minRows={2}
        label={t('shell.common.description')}
      />
    </Stack>
  );
}
