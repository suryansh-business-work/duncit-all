import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

/** myVenueEarningsSummary — settled/pending venue earnings totals. */
export interface VenueEarningsSummary {
  currency_symbol: string;
  lifetime_earnings: number;
  pending_amount: number;
  pods_completed: number;
  this_month_earnings: number;
}

/** The four Venue Earnings stat cards (Lifetime / Pending / This month / Pods). */
export default function StatCards({ summary }: Readonly<{ summary: VenueEarningsSummary }>) {
  const { t } = useTranslation();
  const money = (value: number) => `${summary.currency_symbol}${value.toFixed(2)}`;
  const stats = [
    { label: t('mweb.venueEarnings.lifetime'), value: money(summary.lifetime_earnings) },
    { label: t('mweb.common.pending'), value: money(summary.pending_amount) },
    { label: t('mweb.common.thisMonth'), value: money(summary.this_month_earnings) },
    { label: t('mweb.common.podsCompleted'), value: String(summary.pods_completed) },
  ];

  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
      {stats.map((item) => (
        <Card key={item.label} variant="outlined" sx={{ flex: '1 1 40%', minWidth: 0, borderRadius: '16px' }}>
          <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }} noWrap>
              {item.label}
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 700 }} noWrap>
              {item.value}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
