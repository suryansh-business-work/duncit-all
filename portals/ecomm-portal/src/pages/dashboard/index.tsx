import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Grid, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { formatDay } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { DistributionCard, PageHeader, QueryGuard } from '@duncit/ui';
import { statusLabel } from '@duncit/utils';
import { formatCount, money } from '../../lib/format';
import AttentionRow from './AttentionRow';
import KpiTiles from './KpiTiles';
import { DEFAULT_PERIOD, PERIODS, STORE_DASHBOARD, type Period, type StoreDashboard } from './queries';
import TopProducts from './TopProducts';
import TrendChart from './TrendChart';

/** The period the numbers cover. */
function PeriodSwitch({ value, onChange }: Readonly<{ value: Period; onChange: (days: Period) => void }>) {
  const { t } = useTranslation();
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      aria-label={t('ecommPortal.dashboard.period')}
      onChange={(_event, next: Period | null) => {
        if (next) onChange(next);
      }}
    >
      {PERIODS.map((days) => (
        <ToggleButton key={days} value={days}>
          {t('ecommPortal.dashboard.lastDays', { vars: { days } })}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/** Everything below the header, once the numbers are in. */
function DashboardBody({ board }: Readonly<{ board: StoreDashboard }>) {
  const { t } = useTranslation();
  const labels = useMemo(() => board.series.map((point) => formatDay(point.date)), [board.series]);
  const revenue = useMemo(() => board.series.map((point) => point.revenue), [board.series]);
  const orders = useMemo(() => board.series.map((point) => point.orders), [board.series]);
  const buckets = board.statuses.map((row) => ({ key: statusLabel(row.status, t), count: row.count }));
  return (
    <Stack spacing={3}>
      <AttentionRow board={board} />
      <KpiTiles board={board} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TrendChart
            title={t('ecommPortal.dashboard.revenue')}
            summary={t('ecommPortal.dashboard.revenueSummary', { vars: { value: money(board.revenue), days: board.days } })}
            labels={labels}
            values={revenue}
            format={money}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TrendChart
            title={t('ecommPortal.nav.orders')}
            summary={t('ecommPortal.dashboard.ordersSummary', { vars: { value: formatCount(board.orders), days: board.days } })}
            labels={labels}
            values={orders}
            format={formatCount}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <DistributionCard title={t('ecommPortal.dashboard.byStatus')} buckets={buckets} emptyText={t('ecommPortal.dashboard.noOrders')} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <TopProducts products={board.top_products} />
        </Grid>
      </Grid>
    </Stack>
  );
}

/** The pet store at a glance: what needs doing now, and how the chosen period went. */
export default function DashboardPage() {
  const { t } = useTranslation();
  const [days, setDays] = useState<Period>(DEFAULT_PERIOD);
  const { data, previousData, loading, error } = useQuery(STORE_DASHBOARD, { variables: { days }, fetchPolicy: 'cache-and-network' });
  const board = (data ?? previousData)?.storeDashboard;
  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('ecommPortal.nav.dashboard')}
        subtitle={t('ecommPortal.dashboard.subtitle')}
        actions={<PeriodSwitch value={days} onChange={setDays} />}
      />
      <QueryGuard loading={loading && !board} error={error}>
        {() => board && <DashboardBody board={board} />}
      </QueryGuard>
    </Stack>
  );
}
