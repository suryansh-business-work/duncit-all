import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { useTranslation } from '@duncit/app-settings';
import DashboardHeader from '../../components/DashboardHeader';
import { useMonthsParam } from '../../lib/useMonthsParam';
import CoinMonthlyChart from './CoinMonthlyChart';
import CoinStatTiles from './CoinStatTiles';
import { COIN_ADMIN_STATS, coinCount, type CoinAdminStats } from './queries';

/** Loyalty > Duncit Coin > Dashboard — how many coins the platform has granted,
 * how many members have spent, and what is still outstanding. */
export default function CoinDashboardPage() {
  const { t } = useTranslation();
  const [months, setMonths] = useMonthsParam();

  const { data, loading, error } = useQuery<{ coinAdminStats: CoinAdminStats }>(COIN_ADMIN_STATS, {
    variables: { months },
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.coinAdminStats;

  // The ledger and the per-user balances are two independent reads of the same
  // number. They should agree; when they do not, that is worth saying out loud
  // rather than quietly picking one.
  const drift = stats ? stats.total_outstanding - stats.wallet_balance_total : 0;

  const widgets: DashboardWidget[] = [
    {
      id: 'coin-tiles',
      bare: true,
      // Seven tiles at four per row always wrap — h2 shows one cut row.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <CoinStatTiles stats={stats} loading={loading} />,
    },
    {
      id: 'coin-monthly',
      bare: true,
      defaultLayout: { x: 0, y: 2, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: <CoinMonthlyChart buckets={stats?.monthly ?? []} loading={loading} />,
    },
  ];

  return (
    <DuncitDashboard
      // Kept from the Finance console, so the layout each person arranged there carries over.
      dashboardId="finance.coin"
      header={
        <DashboardHeader
          icon={<MonetizationOnIcon color="primary" />}
          title={t('shell.nav.duncitCoin')}
          subtitle={t('loyalty.coin.dashboardSubtitle', { vars: { symbol: stats?.currency_symbol ?? '₹' } })}
          months={months}
          onMonthsChange={setMonths}
          periodLabel={t('finance.duncitCoin.period')}
          monthsLabel={(n) => t('loyalty.coin.lastMonths', { vars: { n } })}
          errorText={error?.message}
        >
          {stats && drift !== 0 && (
            <Alert severity="warning" data-testid="coin-drift-warning">
              {t('loyalty.coin.driftWarning', {
                vars: {
                  ledger: coinCount(stats.total_outstanding),
                  balances: coinCount(stats.wallet_balance_total),
                  gap: coinCount(Math.abs(drift)),
                },
              })}
            </Alert>
          )}
        </DashboardHeader>
      }
      widgets={widgets}
    />
  );
}
