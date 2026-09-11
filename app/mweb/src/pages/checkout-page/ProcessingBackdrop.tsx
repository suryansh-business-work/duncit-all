import { Backdrop, Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import PaymentLottie from '../../components/PaymentLottie';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  /** Set only while the verify call has died and the payment is being read back
   * from the server. */
  message?: string | null;
}

/** Full-screen "processing your payment" overlay shown while a checkout submits.
 * Shared by the pod-membership and standalone product checkouts. */
export default function ProcessingBackdrop({ open, message }: Readonly<Props>) {
  const { t } = useTranslation();
  // Once the client is reading the payment back, the money has ALREADY moved,
  // so the overlay stops saying "processing" and says what is actually
  // happening. Suppressing the transport error without telling the buyer left
  // them staring at a spinner for half a minute after paying — which is how
  // people end up paying twice.
  const title = message ? t('mweb.checkout.confirmingTitle') : t('mweb.checkout.processingTitle');
  return (
    <Backdrop
      open={open}
      sx={(theme) => ({
        zIndex: theme.zIndex.modal + 1,
        bgcolor: alpha(theme.palette.common.black, 0.5),
        p: 2,
      })}
    >
      <Box
        sx={{
          width: 'min(360px, calc(100vw - 32px))',
          px: 3,
          py: 3,
          borderRadius: '24px',
          textAlign: 'center',
          color: 'text.primary',
          bgcolor: 'background.paper',
        }}
      >
        <PaymentLottie variant="processing" size={118} />
        <Typography sx={{ fontSize: 17, fontWeight: 600 }}>{title}</Typography>
        {message ? (
          <Typography data-testid="checkout-confirming" variant="body2" sx={{ mt: 1 }}>{message}</Typography>
        ) : null}
        <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: 'text.secondary' }}>{t('mweb.checkout.processingNoteWeb')}</Typography>
      </Box>
    </Backdrop>
  );
}
