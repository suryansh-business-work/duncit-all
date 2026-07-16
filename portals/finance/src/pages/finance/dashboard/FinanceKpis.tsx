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

type StatKey = keyof Omit<FinanceDashboardStats, 'currency_symbol'>;
type CardColor = 'primary' | 'success' | 'warning' | 'info' | 'error';

const CARDS: ReadonlyArray<{ key: StatKey; label: string; icon: string; color: CardColor }> = [
  { key: 'total_revenue', label: 'Total Collected (GMV)', icon: 'payments', color: 'primary' },
  { key: 'duncit_revenue', label: 'Duncit Revenue', icon: 'insights', color: 'success' },
  { key: 'gst_collected', label: 'GST Collected', icon: 'quote', color: 'warning' },
  { key: 'pending_payouts', label: 'Pending Payouts', icon: 'receipt', color: 'info' },
  { key: 'completed_payouts', label: 'Completed Payouts', icon: 'orders', color: 'primary' },
];

const trendLabel = (stat?: FinanceStat): string | undefined => {
  if (!stat) return undefined;
  const sign = stat.mom_change_pct >= 0 ? '+' : '';
  return `${sign}${stat.mom_change_pct.toFixed(1)}% vs last month`;
};

const trendColor = (stat?: FinanceStat): string => {
  if (stat && stat.mom_change_pct < 0) return 'error.main';
  return 'success.main';
};

/** Live finance KPIs served by the finance engine (financeDashboardStats). */
export default function FinanceKpis() {
  const { data, loading, error } = useQuery<{ financeDashboardStats: FinanceDashboardStats }>(
    FINANCE_DASHBOARD_STATS,
    { fetchPolicy: 'cache-and-network' },
  );

  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;

  const stats = data?.financeDashboardStats;
  const sym = stats?.currency_symbol ?? '';

  return (
    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2}>
      {CARDS.map((card) => {
        const stat = stats?.[card.key];
        return (
          <StatCard
            key={card.key}
            label={card.label}
            value={`${sym}${(stat?.total ?? 0).toFixed(2)}`}
            icon={<AppIcon name={card.icon} fontSize="small" color={card.color} />}
            loading={loading && !stat}
            hint={trendLabel(stat)}
            hintColor={trendColor(stat)}
            sx={{ borderRadius: 3, flex: '1 1 220px', minWidth: 220 }}
          />
        );
      })}
    </Stack>
  );
}
