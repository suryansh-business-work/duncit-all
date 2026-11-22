import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { categoryOptions } from './categories';
import type { SendMoneyCategory } from './queries';
import type { SendMoneyFormValues } from './send-money.schema';

interface Props {
  control: Control<SendMoneyFormValues>;
  register: UseFormRegister<SendMoneyFormValues>;
  errors: FieldErrors<SendMoneyFormValues>;
  categories: SendMoneyCategory[];
  currencySymbol: string;
  /** A bank account is paid by IMPS or NEFT; a UPI account has no choice to make. */
  chooseMethod: boolean;
  disabled: boolean;
}

/** The payment itself: how much, what for, why, and anything that backs it up. */
export default function SendMoneyFields({
  control,
  register,
  errors,
  categories,
  currencySymbol,
  chooseMethod,
  disabled,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('finance.common.amount')}
          type="number"
          required
          fullWidth
          disabled={disabled}
          error={!!errors.amount}
          helperText={errors.amount?.message}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment> },
            htmlInput: { min: 1, step: '0.01', inputMode: 'decimal' },
          }}
          {...register('amount')}
        />
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              required
              fullWidth
              disabled={disabled}
              label={t('finance.payouts.category')}
              error={!!errors.category}
              helperText={errors.category?.message}
            >
              {categoryOptions(t, categories).map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </Stack>
      {chooseMethod ? (
        <Controller
          name="payout_method"
          control={control}
          render={({ field }) => (
            <TextField {...field} select fullWidth disabled={disabled} label={t('finance.withdrawals.withdrawalMethod')}>
              <MenuItem value="IMPS">IMPS</MenuItem>
              <MenuItem value="NEFT">NEFT</MenuItem>
            </TextField>
          )}
        />
      ) : null}
      <TextField
        label={t('finance.common.reason')}
        required
        fullWidth
        disabled={disabled}
        error={!!errors.reason}
        helperText={errors.reason?.message ?? t('finance.payouts.sendReasonHelp')}
        {...register('reason')}
      />
      <TextField
        label={t('finance.payouts.notes')}
        multiline
        minRows={2}
        fullWidth
        disabled={disabled}
        error={!!errors.notes}
        helperText={errors.notes?.message}
        {...register('notes')}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('finance.payouts.supportingReference')}
          fullWidth
          disabled={disabled}
          error={!!errors.supporting_reference}
          helperText={errors.supporting_reference?.message ?? t('finance.payouts.supportingReferenceHelp')}
          {...register('supporting_reference')}
        />
        <TextField
          label={t('finance.payouts.supportingUrl')}
          fullWidth
          disabled={disabled}
          error={!!errors.supporting_url}
          helperText={errors.supporting_url?.message ?? t('finance.payouts.supportingUrlHelp')}
          {...register('supporting_url')}
        />
      </Stack>
    </Stack>
  );
}
