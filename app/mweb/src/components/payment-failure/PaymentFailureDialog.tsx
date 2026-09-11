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

          {/* The gateway's own words, never ours — a buyer ringing their bank
              needs the reason the bank will recognise. */}
          {failure.description && (
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('mweb.payment.gatewaySaid', { vars: { reason: failure.description } })}
            </Typography>
          )}

          {moneyAtRisk && (
            <Alert severity="info" icon={false}>
              <Typography variant="body2" sx={{
                fontWeight: 600
              }}>
                {t('mweb.payment.moneySafe')}
              </Typography>
              {ticketPending && (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {t('mweb.payment.ticketPending')}
                </Typography>
              )}
              {ticketNo && (
                <Typography variant="body2" sx={{ mt: 0.5 }} data-testid="payment-ticket-no">
                  {t('mweb.payment.ticketRaised', { vars: { ticket: ticketNo } })}
                </Typography>
              )}
              {ticketFailed && (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {t('mweb.payment.ticketFailed')}
                </Typography>
              )}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <DuncitButton fullWidth variant="outlined" onClick={onClose}>{t('mweb.payment.close')}</DuncitButton>
        <DuncitButton fullWidth variant="contained" onClick={onRetry}>
          {t('mweb.payment.retry')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
