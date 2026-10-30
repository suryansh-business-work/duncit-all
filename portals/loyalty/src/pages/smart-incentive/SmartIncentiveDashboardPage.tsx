import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import PercentIcon from '@mui/icons-material/Percent';
import { useTranslation } from '@duncit/app-settings';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import DashboardHeader from '../../components/DashboardHeader';
import { useCurrencySymbol } from '../../lib/useCurrencySymbol';
import { useMonthsParam } from '../../lib/useMonthsParam';
import SmartIncentiveStatTiles from './SmartIncentiveStatTiles';
import SmartIncentiveTopHosts from './SmartIncentiveTopHosts';
import {
  SmartIncentiveDiscountChart,
  SmartIncentiveOffersChart,
  SmartIncentiveSplitChart,
} from './SmartIncentiveCharts';
import {
  SMART_INCENTIVE_ADMIN_STATS,
  SMART_INCENTIVE_CURRENCY,
  type SmartIncentiveAdminStats,
} from './queries';

/**
 * Loyalty > Smart Incentive > Dashboard — the hosts who offer a discount to
 * members who linger on their pod page, the offers shown, how many became
 * bookings, and what the hosts gave away to win them.
 */
export default function SmartIncentiveDashboardPage() {
  const { t } = useTranslation();
  const [months, setMonths] = useMonthsParam();
  const symbol = useCurrencySymbol(SMART_INCENTIVE_CURRENCY);
  const { data, loading, error } = useQuery<{ smartIncentiveAdminStats: SmartIncentiveAdminStats }>(
    SMART_INCENTIVE_ADMIN_STATS,
    { variables: { months }, fetchPolicy: 'cache-and-network' }
  );
  const stats = data?.smartIncentiveAdminStats;
  const monthly = stats?.monthly ?? [];
  // A refetch keeps the last stats on screen; only a first read shows a spinner.
  const waiting = loading && !stats;

  const header = (
    <DashboardHeader
      icon={<PercentIcon color="primary" />}
      title={t('loyalty.smartIncentive.dashboardTitle')}
      // It quotes the live delay and cap, so it waits for them rather than show a guess.
      subtitle={
        stats
          ? t('loyalty.smartIncentive.dashboardSubtitle', {
              vars: { seconds: stats.delay_seconds, max: stats.max_discount_pct },
            })
          : undefined
      }
      errorText={error ? t('loyalty.common.loadError') : null}
      months={months}
      onMonthsChange={setMonths}
      periodLabel={t('loyalty.common.period')}
      monthsLabel={(n) => t('loyalty.common.lastMonths', { vars: { n } })}
    >
      {stats?.enabled === false && <Alert severity="info">{t('loyalty.smartIncentive.programOff')}</Alert>}
    </DashboardHeader>
  );

  const widgets: DashboardWidget[] = [
    {
      id: 'smart-incentive-tiles',
      bare: true,
      // Five tiles at four a row always wrap, so the strip sizes to its content.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <SmartIncentiveStatTiles stats={stats} symbol={symbol} loading={waiting} />,
    },
    {
      id: 'smart-incentive-offers',
      bare: true,
      defaultLayout: { x: 0, y: 2, w: 8, h: 6 },
      minW: 4,
      minH: 4,
      content: <SmartIncentiveOffersChart buckets={monthly} loading={waiting} />,
    },
    {
      id: 'smart-incentive-split',
      bare: true,
      defaultLayout: { x: 8, y: 2, w: 4, h: 6 },
      minW: 3,
      minH: 4,
      content: (
        <SmartIncentiveSplitChart
          shares={stats?.discount_split ?? []}
          maxPct={stats?.max_discount_pct ?? 0}
          loading={waiting}
        />
      ),
    },
    {
      id: 'smart-incentive-discount',
      bare: true,
      defaultLayout: { x: 0, y: 8, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: <SmartIncentiveDiscountChart buckets={monthly} loading={waiting} />,
    },
    {
      id: 'smart-incentive-top-hosts',
      bare: true,
      fitContent: true,
      defaultLayout: { x: 0, y: 14, w: 12, h: 6 },
      minW: 4,
      minH: 3,
      content: <SmartIncentiveTopHosts hosts={stats?.top_hosts ?? []} symbol={symbol} loading={waiting} />,
    },
  ];

  // Saved layouts are keyed on this id — never rename it.
  return <DuncitDashboard dashboardId="loyalty.smartIncentive" header={header} widgets={widgets} />;
}
