import { Controller, type Control } from 'react-hook-form';
import { Alert, FormControlLabel, InputAdornment, Stack, Switch } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { RhfTextField } from '@duncit/forms';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import {
  COMPENSATION_STATUS_COLORS,
  COMPENSATION_STATUS_KEYS,
  ExpenseOptionSelect,
  type CompensationStatus,
} from '../../expense-config';
import type { ExpenseFormValues } from './expense.types';

type FormControl = Control<ExpenseFormValues>;

/**
 * Where the expense stands on being paid back.
 *
 * There is deliberately NO status dropdown. The server derives the status from
 * the amount on every write, so a dropdown here would be a second opinion that
 * disagrees with the money the moment somebody edits one and not the other.
 * What is shown instead is the status the numbers currently produce, computed
 * the same way, so a person sees the consequence of what they typed before
 * they save it.
 */
export function previewStatus(
  amount: number,
  compensated: number,
  rejected: boolean
): CompensationStatus {
  if (rejected) return 'REJECTED';
  if (compensated <= 0) return 'PENDING';
  if (compensated >= amount) return 'FULL';
  return 'PARTIAL';
}

interface Props {
  control: FormControl;
  currency: string;
  status: CompensationStatus;
}

export default function ExpenseCompensationFields({
  control,
  currency,
  status,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <Alert
        severity="info"
        icon={false}
        action={
          <StatusChip
            status={status}
            colorMap={COMPENSATION_STATUS_COLORS}
            label={t(COMPENSATION_STATUS_KEYS[status])}
          />
        }
      >
        {t('finance.expenseConfig.statusIsDerived')}
      </Alert>

      <Controller
        control={control}
        name="compensation_method"
        render={({ field }) => (
          <ExpenseOptionSelect
            kind="COMPENSATION_METHOD"
            label={t('finance.expenseConfig.compensationMethod')}
            value={field.value}
            onChange={field.onChange}
            allowEmpty
            emptyLabel={t('finance.expenseConfig.notDecidedYet')}
          />
        )}
      />

      <RhfTextField
        control={control}
        name="compensated_amount"
        type="number"
        label={t('finance.expenseConfig.compensatedAmount')}
        slotProps={{
          input: { startAdornment: <InputAdornment position="start">{currency}</InputAdornment> },
        }}
      />

      <Controller
        control={control}
        name="compensation_date"
        render={({ field, fieldState }) => (
          <DatePicker
            label={t('finance.expenseConfig.compensationDate')}
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

      <RhfTextField
        control={control}
        name="compensation_reference"
        label={t('finance.expenseConfig.compensationReference')}
      />

      <Controller
        control={control}
        name="compensation_rejected"
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            }
            label={t('finance.expenseConfig.markRejected')}
          />
        )}
      />
    </Stack>
  );
}
