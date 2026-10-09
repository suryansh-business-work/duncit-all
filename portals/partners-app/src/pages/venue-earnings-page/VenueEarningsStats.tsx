import { Grid } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { VenueEarningsSummary } from './queries';

/** The four Venue Earnings figures — Lifetime, Pending, This month, Pods completed. */
export default function VenueEarningsStats({ summary }: Readonly<{ summary: VenueEarningsSummary }>) {
  const { t } = useTranslation();
  const money = (value: number) => formatMoney(value, { symbol: summary.currency_symbol, decimals: 2 });
  const stats = [
    { key: 'lifetime', label: t('partners.hostDashboardPage.lifetimeEarnings'), value: money(summary.lifetime_earnings) },
    { key: 'pending', label: t('partners.hostDashboardPage.pending'), value: money(summary.pending_amount) },
    { key: 'month', label: t('partners.hostDashboardPage.thisMonth'), value: money(summary.this_month_earnings) },
    { key: 'pods', label: t('mweb.common.podsCompleted'), value: String(summary.pods_completed) },
  ];
  return (
    <Grid container spacing={2} data-testid="venue-earnings-stats">
      {stats.map((stat) => (
        <Grid key={stat.key} size={{ xs: 6, md: 3 }}>
          <StatCard label={stat.label} labelWeight={800} value={stat.value} valueWeight={950} testId={`venue-earnings-${stat.key}`} />
        </Grid>
      ))}
    </Grid>
  );
}
