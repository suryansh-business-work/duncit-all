import type { Control } from 'react-hook-form';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import type { WithdrawMethod, WithdrawValues } from '../withdraw.form';

/** The payout details the picked method needs: a UPI id, or the bank account. */
export function PayoutFields({
  control,
  method,
}: Readonly<{ control: Control<WithdrawValues>; method: WithdrawMethod }>) {
  const { t } = useTranslation();
  return method === 'UPI' ? (
    <FormTextField
      control={control}
      name="upi_id"
      label={t('mweb.wallet.upiId')}
      autoCapitalize="none"
      required
    />
  ) : (
    <>
      <FormTextField
        control={control}
        name="account_holder_name"
        label={t('mweb.wallet.accountHolderName')}
        required
      />
      <FormTextField
        control={control}
        name="account_number"
        label={t('mweb.wallet.accountNumber')}
        keyboardType="numeric"
        required
      />
      <FormTextField
        control={control}
        name="ifsc_code"
        label={t('mweb.wallet.ifscCode')}
        autoCapitalize="characters"
        required
      />
    </>
  );
}
