import { Backdrop, Box, Typography } from '@mui/material';
import PaymentLottie from '../../components/PaymentLottie';

/** Full-screen "processing your payment" overlay shown while a checkout submits.
 * Shared by the pod-membership and standalone product checkouts. */
export default function ProcessingBackdrop({ open }: Readonly<{ open: boolean }>) {
  return (
    <Backdrop open={open} sx={{ zIndex: (t) => t.zIndex.modal + 1, bgcolor: 'rgba(3,7,18,0.72)', backdropFilter: 'blur(8px)', p: 2 }}>
      <Box sx={{ width: 'min(360px, calc(100vw - 32px))', px: 3, py: 3, borderRadius: 4, textAlign: 'center', color: '#fff', bgcolor: 'rgba(17,24,39,0.92)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 24px 70px rgba(0,0,0,0.42)' }}>
        <PaymentLottie variant="processing" size={118} />
        <Typography variant="subtitle1" fontWeight={900}>Processing your payment...</Typography>
        <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: 'rgba(255,255,255,0.74)' }}>Please don&apos;t close this tab.</Typography>
      </Box>
    </Backdrop>
  );
}
