import { useQuery } from '@apollo/client/react';
import CampaignIcon from '@mui/icons-material/Campaign';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { useTranslation } from '@duncit/app-settings';
import DashboardHeader from '../../components/DashboardHeader';
import { useMonthsParam } from '../../lib/useMonthsParam';
import ReferralStatTiles from './ReferralStatTiles';
import TopReferrersCard from './TopReferrersCard';
import {
  ReferralCoinsChart,
  ReferralConversionChart,
  ReferralMonthlyChart,
  ReferralPayoutChart,
} from './ReferralCharts';
import { REFERRAL_ADMIN_STATS, type ReferralAdminStats } from './queries';

/**
 * Loyalty > Refer & Earn > Dashboard — the referral programme end to end: codes
 * handed out and still unused, members who joined with one and how many of them
 * paid, the coins it cost, payouts that did not land, and the top referrers.
 */
export default function ReferralDashboardPage() {
  const { t } = useTranslation();
  const [months, setMonths] = useMonthsParam();
  const { data, loading, error } = useQuery<{ referralAdminStats: ReferralAdminStats }>(REFERRAL_ADMIN_STATS, {
    variables: { months },
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.referralAdminStats;
  const monthly = stats?.monthly ?? [];

  const widgets: DashboardWidget[] = [
    {
      id: 'referral-tiles',
      bare: true,
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <ReferralStatTiles stats={stats} loading={loading} />,
    },
    {
      id: 'referral-monthly',
      bare: true,
      defaultLayout: { x: 0, y: 2, w: 8, h: 6 },
      minW: 4,
      minH: 4,
      content: <ReferralMonthlyChart buckets={monthly} loading={loading} />,
    },
    {
      id: 'referral-conversion',
      bare: true,
      defaultLayout: { x: 8, y: 2, w: 4, h: 6 },
      minW: 3,
      minH: 4,
      content: <ReferralConversionChart stats={stats} loading={loading} />,
    },
    {
      id: 'referral-coins',
      bare: true,
      defaultLayout: { x: 0, y: 8, w: 8, h: 6 },
      minW: 4,
      minH: 4,
      content: <ReferralCoinsChart buckets={monthly} loading={loading} />,
    },
    {
      id: 'referral-payouts',
      bare: true,
      defaultLayout: { x: 8, y: 8, w: 4, h: 6 },
      minW: 3,
      minH: 4,
      content: <ReferralPayoutChart stats={stats} loading={loading} />,
    },
    {
      id: 'referral-top',
      bare: true,
      fitContent: true,
      defaultLayout: { x: 0, y: 14, w: 12, h: 6 },
      minW: 4,
      minH: 3,
      content: <TopReferrersCard rows={stats?.top_referrers ?? []} loading={loading} />,
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="loyalty.referrals"
      header={
        <DashboardHeader
          icon={<CampaignIcon color="primary" />}
          title={t('loyalty.referrals.dashboardTitle')}
          subtitle={t('loyalty.referrals.dashboardSubtitle', { vars: { coins: stats?.coins_per_referral ?? 0 } })}
          months={months}
          onMonthsChange={setMonths}
          periodLabel={t('loyalty.common.period')}
          monthsLabel={(n) => t('loyalty.common.lastMonths', { vars: { n } })}
          errorText={error ? t('loyalty.common.loadError') : null}
        />
      }
      widgets={widgets}
    />
  );
}
