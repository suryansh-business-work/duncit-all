import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { labelOf } from '../failed-payments-page/labels';
import { money } from './queries';
import { refundKindTitles, refundSourceLabels } from './refundLabels';
import { REFUND_NOTE_MAX, refundToSourceSchema, type RefundToSourceValues } from './refundToSource.schema';
import type { RefundTarget } from './useRefundToSource';

interface Props {
  target: RefundTarget;
  currencySymbol: string;
  busy: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}

/**
 * Confirm sending one owed refund back to where the buyer paid. It says so in
 * plain words — the same Razorpay payment, never anywhere else — and will not
 * go without a note. The server re-checks that the refund is still owed and
 * safe to repeat, so a stale page cannot send it twice.
 *
 * Mounted only while open, so every opening starts with an empty form.
 */
export default function RefundToSourceDialog({ target, currencySymbol, busy, errorMessage, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { section, entry } = target;
  const { control, handleSubmit } = useForm<RefundToSourceValues>({
    defaultValues: { note: '' },
    resolver: zodResolver(refundToSourceSchema(t)),
  });
  const heading = entry.ref ?? labelOf(refundSourceLabels(t), entry.source);

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="refund-to-source-title">
      <DialogTitle id="refund-to-source-title">{t('finance.payment.refundArea.dialogTitle')}</DialogTitle>
      <form noValidate onSubmit={handleSubmit(({ note }) => onSubmit(note))}>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2">
              {t('finance.payment.refundArea.dialogBody', {
                vars: { amount: money(currencySymbol, entry.amount), kind: refundKindTitles(t)[section.kind], ref: heading },
              })}
            </Typography>
            <Alert severity="warning">{t('finance.payment.refundArea.dialogWarning')}</Alert>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <Controller
              control={control}
              name="note"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={t('finance.payment.refundArea.noteLabel')}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? t('finance.payment.refundArea.noteHint')}
                  slotProps={{ htmlInput: { maxLength: REFUND_NOTE_MAX } }}
                  required
                  multiline
                  minRows={3}
                  fullWidth
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} disabled={busy}>
            {t('finance.payment.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" color="warning" variant="contained" loading={busy} data-testid="refund-to-source-confirm">
            {t('finance.payment.confirmRefund')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
