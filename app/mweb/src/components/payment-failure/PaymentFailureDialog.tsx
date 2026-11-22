import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import { DuncitButton } from '@duncit/buttons';
import { PAYMENT_FAILURE_KEYS, type PaymentFailure } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import PaymentIdLine from './PaymentIdLine';
import PaymentSupportSection from './PaymentSupportSection';

/** The screen lets the buyer file a deduction claim against this Duncit payment. */
export interface PaymentClaimCapability {
  paymentDocId: string;
}

interface Props {
  failure: PaymentFailure | null;
  ticketNo: string | null;
  ticketPending: boolean;
  ticketFailed: boolean;
  /** Pod checkout only. Without it the Support section is not shown. */
  claim?: PaymentClaimCapability | null;
  onRetry: () => void;
  onClose: () => void;
}

/**
 * Why the payment did not go through, said properly.
 *
 * The twin of the native app's dialog (rule 27): same three outcomes, same
 * words, from the shared bundle. Every outcome shows Razorpay's payment id when
 * there is one and what happens to deducted money; a timeout also gets the
 * ticket opened on the buyer's behalf. The Support section — "my payment was
 * deducted" — appears only where the screen passes a claim capability.
 */
export default function PaymentFailureDialog({
  failure,
  ticketNo,
  ticketPending,
  ticketFailed,
  claim,
  onRetry,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!failure) return null;

  const keys = PAYMENT_FAILURE_KEYS[failure.kind];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" data-testid="payment-failure-dialog">
      <Box
        aria-hidden
        sx={(theme) => ({
          width: 64,
          height: 64,
          mx: 'auto',
          mt: 3,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.error.main, 0.12),
          color: 'error.main',
          display: 'grid',
          placeItems: 'center',
        })}
      >
        <ErrorOutlineIcon />
      </Box>
      <DialogTitle sx={{ textAlign: 'center', fontSize: 20, fontWeight: 600 }}>{t(keys.title)}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>{t(keys.body)}</Typography>

          {failure.paymentId && <PaymentIdLine paymentId={failure.paymentId} />}

          {/* The gateway's own words, never ours — a buyer ringing their bank
              needs the reason the bank will recognise. */}
          {failure.description && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('mweb.payment.gatewaySaid', { vars: { reason: failure.description } })}
            </Typography>
          )}

          <Alert severity="info" icon={false} data-testid="payment-deducted-notice">
            <Typography variant="body2">{t('mweb.payment.deductedNotice')}</Typography>
          </Alert>

          {failure.raisesTicket && (
            <Box data-testid="payment-ticket-status">
              {ticketPending && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('mweb.payment.ticketPending')}
                </Typography>
              )}
              {ticketNo && (
                <Typography variant="body2" data-testid="payment-ticket-no">
                  {t('mweb.payment.ticketRaised', { vars: { ticket: ticketNo } })}
                </Typography>
              )}
              {ticketFailed && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('mweb.payment.ticketFailed')}
                </Typography>
              )}
            </Box>
          )}

          {claim?.paymentDocId && <PaymentSupportSection paymentDocId={claim.paymentDocId} />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <DuncitButton fullWidth variant="outlined" onClick={onClose} data-testid="payment-failure-close">
          {t('mweb.payment.close')}
        </DuncitButton>
        <DuncitButton fullWidth variant="contained" onClick={onRetry} data-testid="payment-failure-retry">
          {t('mweb.payment.retry')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
