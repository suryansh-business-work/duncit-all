import { Stack } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '../../i18n/useTranslation';

/** myVenueEarningsSummary — settled/pending venue earnings totals. */
export interface VenueEarningsSummary {
  currency_symbol: string;
  lifetime_earnings: number;
  pending_amount: number;
  pods_completed: number;
  this_month_earnings: number;
}

/** The four Venue Earnings stat cards (Lifetime / Pending / This month / Pods):
 * a muted label over the figure, two to a row. Native twin: EarningsSummaryTiles. */
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
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
      {stats.map((item) => (
        <StatCard
          key={item.label}
          cardVariant="elevation"
          label={item.label}
          labelVariant="caption"
          labelWeight={600}
          value={item.value}
          valueWeight={700}
          valueNoWrap
          valueSx={{ fontSize: '1.25rem', lineHeight: 1.2 }}
          headerSx={{ mb: 0.5 }}
          sx={{ flex: '1 1 40%', minWidth: 0 }}
          contentSx={{ p: 2, '&:last-child': { pb: 2 } }}
        />
      ))}
    </Stack>
  );
}
