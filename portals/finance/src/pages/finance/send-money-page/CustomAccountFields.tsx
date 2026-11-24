import { Controller, useWatch, type Control } from 'react-hook-form';
import { Alert, Checkbox, FormControl, FormControlLabel, FormHelperText, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import type { SendMoneyFormValues } from './send-money.schema';

interface Props {
  control: Control<SendMoneyFormValues>;
  disabled: boolean;
}

/**
 * An account typed in for this one payment, when the person has no verified
 * account or must be paid somewhere else: a UPI ID, or a bank account paid by
 * IMPS or NEFT. The account number is typed twice, and nothing can be sent until
 * Finance ticks that they checked the details. The account is never saved as
 * verified; the transfer is logged as a custom account.
 */
export default function CustomAccountFields({ control, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const method = useWatch({ control, name: 'custom_method' });
  return (
    <Stack spacing={2} sx={{ mt: 1.5 }}>
      <Alert severity="warning">{t('finance.payouts.customAccountWarning')}</Alert>
      <RhfTextField control={control} name="custom_method" label={t('finance.payouts.customMethod')} select fullWidth disabled={disabled}>
        <MenuItem value="UPI">UPI</MenuItem>
        <MenuItem value="IMPS">IMPS</MenuItem>
        <MenuItem value="NEFT">NEFT</MenuItem>
      </RhfTextField>
      {method === 'UPI' ? (
        <RhfTextField
          control={control}
          name="custom_upi_id"
          label={t('finance.payouts.customUpiId')}
          hint={t('finance.payouts.customUpiIdHelp')}
          required
          fullWidth
          disabled={disabled}
          autoComplete="off"
        />
      ) : (
        <>
          <RhfTextField
            control={control}
            name="custom_holder"
            label={t('finance.payouts.customHolder')}
            hint={t('finance.payouts.customHolderHelp')}
            required
            fullWidth
            disabled={disabled}
            autoComplete="off"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <RhfTextField
              control={control}
              name="custom_account_number"
              label={t('finance.payouts.customAccountNumber')}
              required
              fullWidth
              disabled={disabled}
              autoComplete="off"
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
            <RhfTextField
              control={control}
              name="custom_account_number_confirm"
              label={t('finance.payouts.customAccountNumberConfirm')}
              required
              fullWidth
              disabled={disabled}
              autoComplete="off"
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
          </Stack>
          <RhfTextField
            control={control}
            name="custom_ifsc"
            label={t('finance.payouts.customIfsc')}
            hint={t('finance.payouts.customIfscHelp')}
            required
            fullWidth
            disabled={disabled}
            autoComplete="off"
          />
        </>
      )}
      <Controller
        name="acknowledge_custom"
        control={control}
        render={({ field, fieldState }) => (
          <FormControl error={!!fieldState.error}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  onBlur={field.onBlur}
                  disabled={disabled}
                />
              }
              label={t('finance.payouts.customAcknowledge')}
            />
            {fieldState.error ? <FormHelperText>{fieldState.error.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
    </Stack>
  );
}
