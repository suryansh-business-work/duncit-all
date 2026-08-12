import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
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
  const { t } = useTranslation();
  const b = payment.billing;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 300, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          {t('finance.payment.customerTitle')}
        </Typography>
        <Stack spacing={1} divider={<Divider flexItem />}>
          <InfoRow variant="split" label={t('finance.payment.customerName')} value={payment.user_name} />
          <InfoRow variant="split" label={t('finance.payment.customerEmail')} value={payment.user_email} />
          <InfoRow variant="split" label={t('finance.payment.customerPhone')} value={payment.user_phone ?? EM_DASH} />
          <InfoRow variant="split" label={t('finance.payment.billTo')} value={b.name || EM_DASH} />
          <InfoRow variant="split" label={t('finance.payment.billingEmail')} value={b.email || EM_DASH} />
          <InfoRow variant="split" label={t('finance.payment.billingPhone')} value={b.phone || EM_DASH} />
          <InfoRow variant="split" label={t('finance.payment.gstin')} value={b.gstin || EM_DASH} />
          <InfoRow variant="split" label={t('finance.payment.billingAddress')} value={billingAddress(payment)} />
          <InfoRow variant="split" label={t('finance.payment.gatewayReference')} value={payment.gateway_ref ?? EM_DASH} />
        </Stack>
      </CardContent>
    </Card>
  );
}
