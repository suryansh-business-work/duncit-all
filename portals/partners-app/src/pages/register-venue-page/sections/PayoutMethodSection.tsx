import { Controller, type UseFormReturn } from 'react-hook-form';
import { Alert, AlertTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { BANK_PAYOUT_METHODS } from '@duncit/forms';
import type { RegisterVenueValues } from '../register-venue';
import { useTranslation } from '@duncit/shell';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  disabled?: boolean;
}

/** Owner Details is followed by Payout Method: the bank/UPI details that feed
 * Onboarding's Bank Account Verification step, collected up front instead of
 * chased down by an admin after approval. Locked (like Amenities) once the
 * venue is approved — a payout redirect is not a self-serve edit. */
export default function PayoutMethodSection({ form, disabled = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = form;
  const payoutMethod = form.watch('payout_method');
  const isUpi = payoutMethod === 'UPI';
  const showBankRails = payoutMethod === 'IMPS' || payoutMethod === 'NEFT';
  const dynamicHeading = isUpi
    ? t('partners.registerVenuePage.upiDetails')
    : t('partners.registerVenuePage.bankAccountDetails');

  return (
    <Stack spacing={2.5}>
      {disabled && <Alert severity="info">{t('partners.registerVenuePage.payoutLockedAfterApproval')}</Alert>}
      <Alert severity="info" icon={<AccountBalanceIcon />}>
        <AlertTitle sx={{ fontWeight: 800 }}>{t('partners.registerVenuePage.payoutMethod')}</AlertTitle>
        {t('partners.registerVenuePage.payoutMethodHint')}
      </Alert>
      <Controller
        name="payout_method"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            select
            label={t('partners.registerVenuePage.payoutMethod')}
            required
            disabled={disabled}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? ' '}
          >
            {BANK_PAYOUT_METHODS.map((method) => (
              <MenuItem key={method} value={method}>
                {method}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        name="account_holder_name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label={t('partners.registerVenuePage.accountHolderName')}
            required
            disabled={disabled}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? 'Letters and spaces only'}
          />
        )}
      />
      {(isUpi || showBankRails) && (
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {dynamicHeading}
        </Typography>
      )}
      {isUpi && (
        <Controller
          name="upi_id"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={t('partners.registerVenuePage.upiId')}
              required
              disabled={disabled}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? 'e.g. name@bank'}
            />
          )}
        />
      )}
      {showBankRails && (
        <>
          <Controller
            name="account_number"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('partners.registerVenuePage.accountNumber')}
                required
                disabled={disabled}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? '6 to 18 digits'}
              />
            )}
          />
          <Controller
            name="ifsc_code"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                label={t('partners.registerVenuePage.ifscCode')}
                required
                disabled={disabled}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? 'Format ABCD0123456'}
              />
            )}
          />
        </>
      )}
    </Stack>
  );
}
