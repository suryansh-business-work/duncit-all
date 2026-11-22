import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { REVIEW_NOTE_MAX, reviewFailedPaymentSchema } from './review-failed-payment.schema';
import type { ReviewFailedPaymentFormProps, ReviewFailedPaymentValues } from './review-failed-payment.types';

const EMPTY: ReviewFailedPaymentValues = { decision: 'APPROVED', note: '' };

/**
 * One dialog for both decisions a person makes on a case: Review (approve or
 * reject) and Not refundable (close a never-captured payment). The second has
 * no choice to make — only the explanation the buyer's ticket will carry.
 */
export default function ReviewFailedPaymentForm({
  open,
  mode,
  subject,
  busy,
  errorMessage,
  onClose,
  onSubmit,
}: Readonly<ReviewFailedPaymentFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, watch } = useForm<ReviewFailedPaymentValues>({
    defaultValues: EMPTY,
    resolver: zodResolver(reviewFailedPaymentSchema(mode, t)),
  });
  const decision = watch('decision');
  const review = mode === 'REVIEW';

  // A reopened dialog starts blank, never with the last case's note.
  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  const title = review ? t('finance.failedPayments.reviewTitle') : t('finance.failedPayments.notRefundableTitle');
  const noteHint = review && decision === 'APPROVED'
    ? t('finance.failedPayments.noteOptionalHint')
    : t('finance.failedPayments.noteRequiredHint');
  const submitLabel = review ? t('finance.failedPayments.submitReview') : t('finance.failedPayments.confirmNotRefundable');

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="review-failed-payment-title">
      <DialogTitle id="review-failed-payment-title">{title}</DialogTitle>
      <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{subject}</Typography>
            {!review && <Alert severity="info">{t('finance.failedPayments.notRefundableExplainer')}</Alert>}
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            {review && (
              <Controller
                control={control}
                name="decision"
                render={({ field }) => (
                  <TextField {...field} select label={t('finance.failedPayments.decision')} fullWidth>
                    <MenuItem value="APPROVED">{t('finance.failedPayments.approve')}</MenuItem>
                    <MenuItem value="REJECTED">{t('finance.failedPayments.reject')}</MenuItem>
                  </TextField>
                )}
              />
            )}
            <Controller
              control={control}
              name="note"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={t('finance.failedPayments.note')}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? noteHint}
                  slotProps={{ htmlInput: { maxLength: REVIEW_NOTE_MAX } }}
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
          <DuncitButton type="submit" variant="contained" loading={busy}>{submitLabel}</DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
