import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import type { DetailPayment } from './queries';

/** Joins the address lines that are actually filled, so a missing landmark or
 * line 2 does not leave a dangling comma on the invoice bill-to. */
function billingAddress(payment: DetailPayment): string {
  const b = payment.billing;
  const parts = [b.line1, b.line2, b.landmark, b.city, b.state, b.pincode, b.country];
  const filled = parts.filter((part) => part.trim().length > 0);
  return filled.length > 0 ? filled.join(', ') : EM_DASH;
}

/** Who paid, and the billing block frozen on the payment that the invoice prints. */
export default function CustomerCard({ payment }: Readonly<{ payment: DetailPayment }>) {
  const b = payment.billing;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 300, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Customer & Billing
        </Typography>
        <Stack spacing={1} divider={<Divider flexItem />}>
          <InfoRow variant="split" label="Name" value={payment.user_name} />
          <InfoRow variant="split" label="Email" value={payment.user_email} />
          <InfoRow variant="split" label="Phone" value={payment.user_phone ?? EM_DASH} />
          <InfoRow variant="split" label="Bill to" value={b.name || EM_DASH} />
          <InfoRow variant="split" label="Billing email" value={b.email || EM_DASH} />
          <InfoRow variant="split" label="Billing phone" value={b.phone || EM_DASH} />
          <InfoRow variant="split" label="GSTIN" value={b.gstin || EM_DASH} />
          <InfoRow variant="split" label="Address" value={billingAddress(payment)} />
          <InfoRow variant="split" label="Gateway reference" value={payment.gateway_ref ?? EM_DASH} />
        </Stack>
      </CardContent>
    </Card>
  );
}
