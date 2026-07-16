import { useEffect } from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import ReleaseBreakdownLines from './ReleaseBreakdownLines';
import type { PaymentReleaseReviewFormProps, PaymentReleaseReviewValues } from './payment-release-review.types';

export const paymentReleaseReviewSchema = (requestedAmount: number) =>
  z
    .object({
      status: z.enum(['APPROVED', 'REJECTED'], { required_error: 'Status is required' }),
      approval_type: z.enum(['FULL', 'PARTIAL'], { required_error: 'Release type is required' }),
      approved_amount: z
        .number({ invalid_type_error: 'Enter amount', required_error: 'Approved amount is required' })
        .min(0)
        .max(requestedAmount, 'Cannot exceed requested amount'),
      approval_reason: z.string().trim().max(1000).default(''),
    })
    .superRefine((values, ctx) => {
      const needsReason = values.status === 'REJECTED' || values.approval_type === 'PARTIAL';
      if (needsReason && !values.approval_reason) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approval_reason'], message: 'Reason is required' });
      }
    });

export function toReviewInput(values: PaymentReleaseReviewValues, requestedAmount: number) {
  const approved = values.status === 'APPROVED';
  return {
    status: values.status,
    approval_type: approved ? values.approval_type : undefined,
    approved_amount: approved && values.approval_type === 'FULL' ? requestedAmount : Number(values.approved_amount),
    approval_reason: values.approval_reason || undefined,
  };
}

export default function PaymentReleaseReviewForm({ request, busy, errorMessage, onClose, onSubmit }: Readonly<PaymentReleaseReviewFormProps>) {
  const requestedAmount = Number(request?.amount_requested || 0);
  const { control, handleSubmit, watch, setValue, reset } = useForm<PaymentReleaseReviewValues>({
    defaultValues: { status: 'APPROVED', approval_type: 'FULL', approved_amount: requestedAmount, approval_reason: '' },
    resolver: zodResolver(paymentReleaseReviewSchema(requestedAmount)),
  });
  const status = watch('status');
  const approvalType = watch('approval_type');

  useEffect(() => {
    reset({ status: 'APPROVED', approval_type: 'FULL', approved_amount: requestedAmount, approval_reason: '' });
  }, [requestedAmount, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={!!request} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Review Payment Release</DialogTitle>
      <form noValidate onSubmit={submit}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <ReleaseBreakdownLines request={request} />
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <TextField {...field} select label="Decision" fullWidth>
                  <MenuItem value="APPROVED">Approve</MenuItem>
                  <MenuItem value="REJECTED">Reject</MenuItem>
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="approval_type"
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Release type"
                  onChange={(event) => {
                    field.onChange(event);
                    if (event.target.value === 'FULL') {
                      setValue('approved_amount', requestedAmount);
                    }
                  }}
                  disabled={status === 'REJECTED'}
                  fullWidth
                >
                  <MenuItem value="FULL">Full Release</MenuItem>
                  <MenuItem value="PARTIAL">Partial Release</MenuItem>
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="approved_amount"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value === '' ? '' : Number(event.target.value))}
                  label="Approved amount"
                  type="number"
                  disabled={status === 'REJECTED' || approvalType === 'FULL'}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? `Requested Rs ${requestedAmount.toFixed(2)}`}
                  fullWidth
                />
              )}
            />
            <Controller
              control={control}
              name="approval_reason"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Reason"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? 'Required for partial release or rejection'}
                  multiline
                  minRows={3}
                  fullWidth
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving...' : 'Submit Review'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
