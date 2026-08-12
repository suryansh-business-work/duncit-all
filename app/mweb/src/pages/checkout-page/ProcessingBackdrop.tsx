import { Backdrop, Box, Typography } from '@mui/material';
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
    <Backdrop open={open} sx={{ zIndex: (t) => t.zIndex.modal + 1, bgcolor: 'rgba(3,7,18,0.72)', backdropFilter: 'blur(8px)', p: 2 }}>
      <Box sx={{ width: 'min(360px, calc(100vw - 32px))', px: 3, py: 3, borderRadius: '16px', textAlign: 'center', color: '#fff', bgcolor: 'rgba(17,24,39,0.92)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 24px 70px rgba(0,0,0,0.42)' }}>
        <PaymentLottie variant="processing" size={118} />
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {message ? (
          <Typography data-testid="checkout-confirming" variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.92)' }}>{message}</Typography>
        ) : null}
        <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: 'rgba(255,255,255,0.74)' }}>{t('mweb.checkout.processingNoteWeb')}</Typography>
      </Box>
    </Backdrop>
  );
}
