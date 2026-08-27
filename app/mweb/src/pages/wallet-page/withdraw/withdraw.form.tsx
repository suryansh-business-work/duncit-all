import { useEffect } from 'react';
import { z } from 'zod';
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
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { fallbackT, type Translate } from '../../../i18n/fallback';
import { REQUEST_WITHDRAWAL } from '../queries';
import { blankWithdrawValues, type WithdrawValues } from './withdraw.types';

/**
 * @param max The wallet balance — nobody may withdraw more than they hold.
 * @param min The role-wise floor from the server. The server enforces TWO
   rules (balance >= min AND amount >= min); validating only the balance here
   let someone with a healthy balance submit an under-floor amount and meet a
   raw server error instead of a field message. 0 disables the floor.
 */
export const buildWithdrawSchema = (max: number, min = 0, t: Translate = fallbackT) =>
  z
    .object({
      amount: z
        .string()
        .refine((v) => Number(v) > 0, t('mweb.wallet.enterAnAmount'))
        .refine((v) => Number(v) <= max, t('mweb.wallet.maxAmount', { vars: { max } }))
        .refine(
          (v) => min <= 0 || Number(v) >= min,
          t('mweb.wallet.minimumAmount', { vars: { min } }),
        ),
      payout_method: z.enum(['UPI', 'IMPS', 'NEFT']),
      upi_id: z.string().trim(),
      account_holder_name: z.string().trim(),
      account_number: z.string().trim(),
      ifsc_code: z.string().trim(),
    })
    .superRefine((v, ctx) => {
      if (v.payout_method === 'UPI') {
        if (!v.upi_id) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['upi_id'], message: t('mweb.wallet.enterYourUpiId') });
      } else {
        if (!v.account_number) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['account_number'], message: t('mweb.wallet.enterAccountNumber') });
        if (!v.ifsc_code) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ifsc_code'], message: t('mweb.wallet.enterIfscCode') });
      }
    });

export function buildWithdrawInput(values: WithdrawValues) {
  return {
    amount: Number(values.amount),
    payout_method: values.payout_method,
    upi_id: values.upi_id.trim() || undefined,
    account_holder_name: values.account_holder_name.trim() || undefined,
    account_number: values.account_number.trim() || undefined,
    ifsc_code: values.ifsc_code.trim() || undefined,
  };
}

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
  } = useForm<WithdrawValues>({ resolver: zodResolver(buildWithdrawSchema(maxAmount, minAmount, t)), defaultValues: blankWithdrawValues });
  const [request, state] = useMutation(REQUEST_WITHDRAWAL);
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
            {['UPI', 'IMPS', 'NEFT'].map((m) => (
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
