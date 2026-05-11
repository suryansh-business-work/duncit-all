import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import PaymentLottie from '../../components/PaymentLottie';
import { formatMoney } from './checkoutMath';

interface Props {
  payment: any;
  onHome: () => void;
  onProfile: () => void;
}

export default function CheckoutSuccess({ payment, onHome, onProfile }: Props) {
  return (
    <Box sx={{ maxWidth: 540, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <PaymentLottie variant="success" size={140} />
          <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mt: 1 }}>Payment Successful</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Your slot is booked. A receipt with the tax invoice has been emailed to you.
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 3, textAlign: 'left' }}>
            <Row label="Amount paid" value={formatMoney(payment.currency_symbol, payment.total)} bold />
            <Row label="Payment ID" value={payment.payment_id} mono />
            {payment.invoice_no && <Row label="Invoice" value={payment.invoice_no} mono />}
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ mt: 4, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={onHome}>Home</Button>
            <Button variant="contained" onClick={onProfile}>My Profile</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 500}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 500} sx={mono ? { fontFamily: 'monospace' } : undefined}>{value}</Typography>
    </Stack>
  );
}
