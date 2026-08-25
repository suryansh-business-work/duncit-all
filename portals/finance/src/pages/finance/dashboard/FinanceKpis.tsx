import { useQuery } from '@apollo/client';
import { Alert, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { StatCard } from '@duncit/ui';
import { AppIcon } from '@duncit/shell';
import {
  FINANCE_DASHBOARD_STATS,
  type FinanceDashboardStats,
  type FinanceStat,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

type StatKey = keyof Omit<FinanceDashboardStats, 'currency_symbol'>;
type CardColor = 'primary' | 'success' | 'warning' | 'info' | 'error';

type Translate = ReturnType<typeof useTranslation>['t'];

interface KpiCard {
  key: StatKey;
  label: string;
  icon: string;
  color: CardColor;
  /** A rise is BAD for this metric (spend), so the trend colour flips. */
  riseIsBad?: boolean;
}

const cards = (t: Translate): ReadonlyArray<KpiCard> => [
  { key: 'total_revenue', label: t('finance.dashboard.totalCollectedGmv'), icon: 'payments', color: 'primary' },
  { key: 'duncit_revenue', label: t('finance.dashboard.duncitRevenue'), icon: 'insights', color: 'success' },
  { key: 'gst_collected', label: t('finance.dashboard.gstCollected'), icon: 'quote', color: 'warning' },
  { key: 'pending_payouts', label: t('finance.dashboard.pendingPayouts'), icon: 'receipt', color: 'info' },
  { key: 'completed_payouts', label: t('finance.dashboard.completedPayouts'), icon: 'orders', color: 'primary' },
  { key: 'pod_expenses', label: t('finance.dashboard.podExpenses'), icon: 'receipt', color: 'error', riseIsBad: true },
];

const trendLabel = (stat?: FinanceStat): string | undefined => {
  if (!stat) return undefined;
  const sign = stat.mom_change_pct >= 0 ? '+' : '';
  return `${sign}${stat.mom_change_pct.toFixed(1)}% vs last month`;
};

/** Green means "the right direction". For spend that is DOWN, not up. */
const trendColor = (stat: FinanceStat | undefined, riseIsBad = false): string => {
  const fell = !!stat && stat.mom_change_pct < 0;
  const good = riseIsBad ? fell : !fell;
  return good ? 'success.main' : 'error.main';
};

/** Live finance KPIs served by the finance engine (financeDashboardStats). */
export default function FinanceKpis() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ financeDashboardStats: FinanceDashboardStats }>(
    FINANCE_DASHBOARD_STATS,
    { fetchPolicy: 'cache-and-network' },
  );

  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;

  const stats = data?.financeDashboardStats;
  const sym = stats?.currency_symbol ?? '';

  return (
    <Stack direction="row" useFlexGap spacing={2} sx={{
      flexWrap: "wrap"
    }}>
      {cards(t).map((card) => {
        const stat = stats?.[card.key];
        return (
          <StatCard
            key={card.key}
            label={card.label}
            value={`${sym}${(stat?.total ?? 0).toFixed(2)}`}
            icon={<AppIcon name={card.icon} fontSize="small" color={card.color} />}
            loading={loading && !stat}
            hint={trendLabel(stat)}
            hintColor={trendColor(stat, card.riseIsBad)}
            sx={{ borderRadius: 3, flex: '1 1 220px', minWidth: 220 }}
          />
        );
      })}
    </Stack>
  );
}
