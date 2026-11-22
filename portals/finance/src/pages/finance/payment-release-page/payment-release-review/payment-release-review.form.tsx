import { useEffect } from 'react';
import { z } from 'zod';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import ReleaseBreakdownLines from './ReleaseBreakdownLines';
import type { PaymentReleaseReviewFormProps, PaymentReleaseReviewValues } from './payment-release-review.types';
import { useTranslation } from '@duncit/app-settings';
import { fallbackT, type Translate } from '@duncit/shell';
import { FundingNoteField, SHORTFALL_NOTE_MAX, SHORTFALL_NOTE_MIN, fundingNoteMessages } from '../shortfall-funding';
import { money } from '../../pod-finance-page/queries';

/** `fundingShortfall`: the release's frozen funding_shortfall — approving it needs a funding note. */
export const paymentReleaseReviewSchema = (requestedAmount: number, t: Translate = fallbackT, fundingShortfall = 0) =>
  z
    .object({
      status: z.enum(['APPROVED', 'REJECTED'], { error: 'Status is required' }),
      approval_type: z.enum(['FULL', 'PARTIAL'], { error: 'Release type is required' }),
      approved_amount: z
        // One message now covers both a missing amount and a non-numeric one.
        .number({ error: 'Approved amount is required' })
        .min(0)
        .max(requestedAmount, 'Cannot exceed requested amount'),
      approval_reason: z.string().trim().max(1000).default(''),
      shortfall_funding_note: z.string().trim().max(SHORTFALL_NOTE_MAX, fundingNoteMessages(t).tooLong).default(''),
    })
    .superRefine((values, ctx) => {
      const needsReason = values.status === 'REJECTED' || values.approval_type === 'PARTIAL';
      if (needsReason && !values.approval_reason) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approval_reason'], message: t('finance.paymentRelease.reasonIsRequired') });
      }
      // The server refuses to approve a payout beyond the pod's takings without it.
      const needsFunding = values.status === 'APPROVED' && fundingShortfall > 0;
      if (needsFunding && values.shortfall_funding_note.length < SHORTFALL_NOTE_MIN) {
        ctx.addIssue({ code: 'custom', path: ['shortfall_funding_note'], message: fundingNoteMessages(t).tooShort });
      }
    });

export function toReviewInput(values: PaymentReleaseReviewValues, requestedAmount: number) {
  const approved = values.status === 'APPROVED';
  return {
    status: values.status,
    approval_type: approved ? values.approval_type : undefined,
    approved_amount: approved && values.approval_type === 'FULL' ? requestedAmount : Number(values.approved_amount),
    approval_reason: values.approval_reason || undefined,
    // Only an approval is checked for it, and the server records it on that payout.
    shortfall_funding_note: (approved && values.shortfall_funding_note) || undefined,
  };
}

export default function PaymentReleaseReviewForm({ request, symbol, busy, errorMessage, onClose, onSubmit }: Readonly<PaymentReleaseReviewFormProps>) {
  const { t } = useTranslation();
  const requestedAmount = Number(request?.amount_requested || 0);
  const fundingShortfall = Number(request?.breakdown?.funding_shortfall) || 0;
  const { control, handleSubmit, watch, setValue, reset } = useForm<PaymentReleaseReviewValues, any, PaymentReleaseReviewValues>({
    defaultValues: { status: 'APPROVED', approval_type: 'FULL', approved_amount: requestedAmount, approval_reason: '', shortfall_funding_note: '' },
    resolver: zodResolver(paymentReleaseReviewSchema(requestedAmount, t, fundingShortfall)) as unknown as Resolver<PaymentReleaseReviewValues, any, PaymentReleaseReviewValues>,
  });
  const status = watch('status');
  const approvalType = watch('approval_type');
  const needsFunding = status === 'APPROVED' && fundingShortfall > 0;
  const requestId = request?.id;

  // Each payout opened starts clean — a funding note typed for one is never sent with another.
  useEffect(() => {
    reset({ status: 'APPROVED', approval_type: 'FULL', approved_amount: requestedAmount, approval_reason: '', shortfall_funding_note: '' });
  }, [requestId, requestedAmount, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={!!request} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('finance.paymentRelease.reviewPaymentRelease')}</DialogTitle>
      <form noValidate onSubmit={submit}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <ReleaseBreakdownLines request={request} />
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <TextField {...field} select label={t('finance.paymentRelease.decision')} fullWidth>
                  <MenuItem value="APPROVED">{t('finance.paymentRelease.approve')}</MenuItem>
                  <MenuItem value="REJECTED">{t('finance.paymentRelease.reject')}</MenuItem>
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
                  label={t('finance.paymentRelease.releaseType')}
                  onChange={(event) => {
                    field.onChange(event);
                    if (event.target.value === 'FULL') {
                      setValue('approved_amount', requestedAmount);
                    }
                  }}
                  disabled={status === 'REJECTED'}
                  fullWidth
                >
                  <MenuItem value="FULL">{t('finance.paymentRelease.fullRelease')}</MenuItem>
                  <MenuItem value="PARTIAL">{t('finance.paymentRelease.partialRelease')}</MenuItem>
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
                  label={t('finance.paymentRelease.approvedAmount')}
                  type="number"
                  disabled={status === 'REJECTED' || approvalType === 'FULL'}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? `Requested Rs ${requestedAmount.toFixed(2)}`}
                  fullWidth
                />
              )}
            />
            {needsFunding && (
              <>
                <Alert severity="warning" data-testid="review-funding-shortfall">
                  {t('finance.paymentRelease.fundingReviewIntro', { vars: { amount: money(symbol, fundingShortfall) } })}
                </Alert>
                <FundingNoteField control={control} name="shortfall_funding_note" />
              </>
            )}
            <Controller
              control={control}
              name="approval_reason"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={t('finance.common.reason')}
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
          <DuncitButton onClick={onClose} disabled={busy}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy}>{busy ? 'Saving...' : 'Submit Review'}</DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
