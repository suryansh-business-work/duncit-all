import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { REQUEST_WITHDRAWAL } from '../queries';
import { blankWithdrawValues, type WithdrawValues } from './withdraw.types';

export const buildWithdrawSchema = (max: number) =>
  z
    .object({
      amount: z
        .string()
        .refine((v) => Number(v) > 0, 'Enter an amount')
        .refine((v) => Number(v) <= max, `Max ${max}`),
      payout_method: z.enum(['UPI', 'IMPS', 'NEFT']),
      upi_id: z.string().trim(),
      account_holder_name: z.string().trim(),
      account_number: z.string().trim(),
      ifsc_code: z.string().trim(),
    })
    .superRefine((v, ctx) => {
      if (v.payout_method === 'UPI') {
        if (!v.upi_id)
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['upi_id'], message: 'Enter your UPI ID' });
      } else {
        if (!v.account_number)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['account_number'],
            message: 'Enter account number',
          });
        if (!v.ifsc_code)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ifsc_code'],
            message: 'Enter IFSC code',
          });
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
  currency: string;
  onClose: () => void;
  onDone: () => void;
}

export default function WithdrawForm({ open, maxAmount, currency, onClose, onDone }: Readonly<Props>) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<WithdrawValues>({
    resolver: zodResolver(buildWithdrawSchema(maxAmount)),
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
      <DialogTitle sx={{ fontWeight: 900 }}>Withdraw from wallet</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="withdraw-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label={`Amount (max ${currency}${maxAmount.toFixed(2)})`}
            type="number"
            required
            {...register('amount')}
            error={!!errors.amount}
            helperText={errors.amount?.message}
          />
          <TextField select label="Payout method" defaultValue="UPI" {...register('payout_method')}>
            {['UPI', 'IMPS', 'NEFT'].map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
          {method === 'UPI' ? (
            <TextField
              label="UPI ID"
              {...register('upi_id')}
              error={!!errors.upi_id}
              helperText={errors.upi_id?.message}
            />
          ) : (
            <>
              <TextField label="Account holder name" {...register('account_holder_name')} />
              <TextField
                label="Account number"
                {...register('account_number')}
                error={!!errors.account_number}
                helperText={errors.account_number?.message}
              />
              <TextField
                label="IFSC code"
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
        <Button onClick={onClose} disabled={state.loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="withdraw-form"
          variant="contained"
          disabled={state.loading}
          sx={{ borderRadius: 999, fontWeight: 900 }}
        >
          {state.loading ? 'Requesting…' : 'Request withdrawal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
