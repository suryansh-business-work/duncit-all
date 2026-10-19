import { Alert, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { round2 } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { money, type DetailPayment } from './queries';

/**
 * The rented items inside this payment's total: each item's rent and its
 * refundable deposit, and how the deposit is settled — handed back by the
 * venue in cash, never refunded through the gateway, and paid to the venue in
 * its VENUE_RENTAL payout. Renders nothing for a payment without rentals.
 */
export default function RentalBreakupCard({ payment }: Readonly<{ payment: DetailPayment }>) {
  const { t } = useTranslation();
  const lines = payment.rental_lines ?? [];
  if (lines.length === 0) return null;
  const sym = payment.currency_symbol;
  const rent = round2(lines.reduce((sum, line) => sum + line.rent, 0));
  const deposit = round2(lines.reduce((sum, line) => sum + line.deposit, 0));

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: '100%' }} data-testid="payment-rental-breakup">
      <CardContent>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t('venueRentals.finance.title')}
        </Typography>
        <Stack spacing={1}>
          {lines.map((line) => (
            <Stack key={line.item_id} spacing={0.5}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t('venueRentals.finance.itemLine', { vars: { name: line.name, quantity: line.quantity } })}
              </Typography>
              <InfoRow variant="split" label={t('venueRentals.finance.rent')} value={money(sym, line.rent)} />
              {line.deposit > 0 && (
                <InfoRow variant="split" label={t('venueRentals.finance.deposit')} value={money(sym, line.deposit)} />
              )}
            </Stack>
          ))}
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <InfoRow variant="split" bold label={t('venueRentals.finance.total')} value={money(sym, round2(rent + deposit))} />
        {deposit > 0 && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            {t('venueRentals.finance.depositNote')}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
