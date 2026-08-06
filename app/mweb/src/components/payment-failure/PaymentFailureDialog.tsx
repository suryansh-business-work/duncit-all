import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { PAYMENT_FAILURE_KEYS, type PaymentFailure } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  failure: PaymentFailure | null;
  ticketNo: string | null;
  ticketPending: boolean;
  ticketFailed: boolean;
  onRetry: () => void;
  onClose: () => void;
}

/**
 * Why the payment did not go through, said properly.
 *
 * The twin of the native app's dialog (rule 27): same three outcomes, same
 * words, from the shared bundle. A timeout gets the reassurance and the ticket
 * number; a cancellation gets neither, because nothing happened to anybody's
 * money and a case file would be noise.
 */
export default function PaymentFailureDialog({
  failure,
  ticketNo,
  ticketPending,
  ticketFailed,
  onRetry,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!failure) return null;

  const keys = PAYMENT_FAILURE_KEYS[failure.kind];
  const moneyAtRisk = failure.raisesTicket;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t(keys.title)}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2">{t(keys.body)}</Typography>

          {/* The gateway's own words, never ours — a buyer ringing their bank
              needs the reason the bank will recognise. */}
          {failure.description && (
            <Typography variant="caption" color="text.secondary">
              {t('mweb.payment.gatewaySaid', { vars: { reason: failure.description } })}
            </Typography>
          )}

          {moneyAtRisk && (
            <Alert severity="info" icon={false}>
              <Typography variant="body2" fontWeight={600}>
                {t('mweb.payment.moneySafe')}
              </Typography>
              {ticketPending && (
                <Typography variant="caption" color="text.secondary">
                  {t('mweb.payment.ticketPending')}
                </Typography>
              )}
              {ticketNo && (
                <Typography variant="body2" sx={{ mt: 0.5 }} data-testid="payment-ticket-no">
                  {t('mweb.payment.ticketRaised', { vars: { ticket: ticketNo } })}
                </Typography>
              )}
              {ticketFailed && (
                <Typography variant="caption" color="text.secondary">
                  {t('mweb.payment.ticketFailed')}
                </Typography>
              )}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('mweb.payment.close')}</Button>
        <Button variant="contained" onClick={onRetry}>
          {t('mweb.payment.retry')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
