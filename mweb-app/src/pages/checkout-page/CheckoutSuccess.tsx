import { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import PaymentLottie from '../../components/PaymentLottie';
import ConfettiOverlay from '../../components/ConfettiOverlay';
import { formatMoney } from './checkoutMath';

interface Props {
  payment: any;
  onHome: () => void;
  onProfile: () => void;
}

export default function CheckoutSuccess({ payment, onHome, onProfile }: Props) {
  const [confetti, setConfetti] = useState(true);
  return (
    <Box sx={{ maxWidth: 540, mx: 'auto', minHeight: '100%', display: 'grid', alignItems: 'center', p: 1 }}>
      <ConfettiOverlay open={confetti} onClose={() => setConfetti(false)} />
      <Card sx={{ borderRadius: 5, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)', boxShadow: '0 24px 60px rgba(17,24,39,0.28)' }}>
        <CardContent sx={{ textAlign: 'center', p: 3 }}>
          <PaymentLottie variant="success" size={140} />
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.62)', letterSpacing: 0, lineHeight: 1 }}>You are in</Typography>
          <Typography variant="h4" fontWeight={900} gutterBottom sx={{ mt: 0.5, lineHeight: 1.05 }}>Payment Successful</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }} gutterBottom>
            Your slot is booked. A receipt with the tax invoice has been emailed to you.
          </Typography>
          <Box sx={{ mt: 3, p: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.09)', textAlign: 'left', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Stack spacing={0.8}>
            <Row label="Amount paid" value={formatMoney(payment.currency_symbol, payment.total)} bold />
            <Row label="Payment ID" value={payment.payment_id} mono />
            {payment.invoice_no && <Row label="Invoice" value={payment.invoice_no} mono />}
          </Stack>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ mt: 4, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={onHome} sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff', borderRadius: 999 }}>Home</Button>
            <Button variant="contained" onClick={onProfile} sx={{ borderRadius: 999, fontWeight: 900, background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)' }}>My Profile</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 500}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 500} sx={mono ? { fontFamily: 'monospace' } : undefined}>{value}</Typography>
    </Stack>
  );
}
