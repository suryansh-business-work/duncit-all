import type { ReactNode } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { fmt } from './helpers';
import type { PaymentTotals } from './queries';

/** One KPI: a caption over its figure. */
function TotalCard({ label, value }: Readonly<{ label: ReactNode; value: ReactNode }>) {
  return (
    <Card variant="outlined" sx={{ flex: 1 }}>
      <CardContent sx={{ py: 1.5 }}>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {label}
        </Typography>
        <Typography component="p" variant="h6" sx={{
          fontWeight: 700
        }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function TotalsCards({ totals }: Readonly<{ totals: PaymentTotals }>) {
  const { t } = useTranslation();
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
      <TotalCard label={t('finance.payment.totalSuccessful')} value={totals.count} />
      <TotalCard label={t('finance.payment.totalGross')} value={fmt(totals.gross)} />
      <TotalCard label={t('finance.payment.totalFees')} value={fmt(totals.fee)} />
      <TotalCard label={t('finance.payment.totalGst')} value={fmt(totals.gst)} />
      {/* Already off the gross above — the tiers cut the ticket price before checkout. */}
      <TotalCard label={t('finance.payment.totalTicketDiscount')} value={fmt(totals.ticket_discount_total)} />
    </Stack>
  );
}
