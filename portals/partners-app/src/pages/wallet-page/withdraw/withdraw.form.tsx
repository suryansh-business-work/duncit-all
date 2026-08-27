import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client';
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
import { REQUEST_WITHDRAWAL } from '../queries';
import {
  blankWithdrawValues,
  buildWithdrawInput,
  makeWithdrawSchema,
  WITHDRAW_METHODS,
  type WithdrawValues,
} from '@duncit/forms/schemas';
import { useTranslation } from '@duncit/shell';

interface Props {
  open: boolean;
  maxAmount: number;
  /** Role-wise floor from the server; 0 when none applies. */
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
  } = useForm<WithdrawValues>({
    resolver: zodResolver(makeWithdrawSchema(maxAmount, minAmount, t)),
    defaultValues: blankWithdrawValues,
  });
  const [request, state] = useMutation(REQUEST_WITHDRAWAL);
  const method = watch('payout_method');

  useEffect(() => {
    reset(blankWithdrawValues);
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    await request({ variables: { input: buildWithdrawInput(values) } });
    onDone();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900 }}>{t('partners.walletPage.withdrawFromWallet')}</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="withdraw-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label={t('partners.walletPage.amountMax', {
              vars: { max: `${currency}${maxAmount.toFixed(2)}` },
            })}
            type="number"
            required
            {...register('amount')}
            error={!!errors.amount}
            helperText={errors.amount?.message}
          />
          <TextField select label={t('partners.walletPage.payoutMethod')} defaultValue="UPI" {...register('payout_method')}>
            {WITHDRAW_METHODS.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
          {method === 'UPI' ? (
            <TextField
              label={t('partners.common.upiId')}
              {...register('upi_id')}
              error={!!errors.upi_id}
              helperText={errors.upi_id?.message}
            />
          ) : (
            <>
              <TextField label={t('partners.common.accountHolderName')} {...register('account_holder_name')} />
              <TextField
                label={t('partners.common.accountNumber')}
                {...register('account_number')}
                error={!!errors.account_number}
                helperText={errors.account_number?.message}
              />
              <TextField
                label={t('partners.common.ifscCode')}
                {...register('ifsc_code')}
                error={!!errors.ifsc_code}
                helperText={errors.ifsc_code?.message}
              />
            </>
          )}
          {state.error && <Alert severity="error">{state.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={state.loading}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form="withdraw-form"
          variant="contained"
          disabled={state.loading}
          sx={{ borderRadius: 999, fontWeight: 900 }}
        >
          {state.loading
            ? t('partners.walletPage.requesting')
            : t('partners.walletPage.requestWithdrawal')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
