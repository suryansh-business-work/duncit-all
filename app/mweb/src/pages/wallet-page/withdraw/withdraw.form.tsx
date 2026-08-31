import { useEffect } from 'react';
import { useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { REQUEST_WITHDRAWAL } from '../queries';
import {
  blankWithdrawValues,
  buildWithdrawInput,
  makeWithdrawSchema,
  WITHDRAW_METHODS,
  type WithdrawValues,
} from '@duncit/forms/schemas';

interface Props {
  open: boolean;
  maxAmount: number;
  /** Role-wise Minimum Withdrawal Amount as sent by the server. 0 = no floor. */
  minAmount: number;
  currency: string;
  onClose: () => void;
  onDone: () => void;
}

export default function WithdrawForm({ open, maxAmount, minAmount, currency, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<WithdrawValues, any, WithdrawValues>({ resolver: zodResolver(makeWithdrawSchema(maxAmount, minAmount, t)) as unknown as Resolver<WithdrawValues, any, WithdrawValues>, defaultValues: blankWithdrawValues });
  const [request, state] = useMutation<any>(REQUEST_WITHDRAWAL);
  const method = watch('payout_method');
  const minHint =
    minAmount > 0
      ? t('mweb.wallet.minimumHint', { vars: { amount: formatMoney(minAmount, { symbol: currency }) } })
      : undefined;

  useEffect(() => {
    reset(blankWithdrawValues);
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    await request({ variables: { input: buildWithdrawInput(values) } });
    onDone();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.wallet.withdrawFromWallet')}</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="withdraw-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label={t('mweb.wallet.amountMax', { vars: { max: `${currency}${maxAmount.toFixed(2)}` } })}
            type="number"
            required
            {...register('amount')}
            error={!!errors.amount}
            helperText={errors.amount?.message ?? minHint}
          />
          <TextField select label={t('mweb.wallet.payoutMethod')} defaultValue="UPI" {...register('payout_method')}>
            {WITHDRAW_METHODS.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
          {method === 'UPI' ? (
            <TextField label={t('mweb.wallet.upiId')} {...register('upi_id')} error={!!errors.upi_id} helperText={errors.upi_id?.message} />
          ) : (
            <>
              <TextField label={t('mweb.wallet.accountHolderName')} {...register('account_holder_name')} />
              <TextField label={t('mweb.wallet.accountNumber')} {...register('account_number')} error={!!errors.account_number} helperText={errors.account_number?.message} />
              <TextField label={t('mweb.wallet.ifscCode')} {...register('ifsc_code')} error={!!errors.ifsc_code} helperText={errors.ifsc_code?.message} />
            </>
          )}
          {state.error && <Alert severity="error">{state.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={state.loading}>
          {t('mweb.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" form="withdraw-form" variant="contained" disabled={state.loading} sx={{ borderRadius: 999, fontWeight: 700 }}>
          {state.loading ? t('mweb.wallet.requesting') : t('mweb.wallet.requestWithdrawal')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
