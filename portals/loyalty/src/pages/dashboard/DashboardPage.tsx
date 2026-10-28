import InsightsIcon from '@mui/icons-material/Insights';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { useTranslation } from '@duncit/app-settings';
import DashboardHeader from '../../components/DashboardHeader';
import { useMonthsParam } from '../../lib/useMonthsParam';
import CoinMonthlyChart from '../duncit-coin/CoinMonthlyChart';
import GiftCardMonthlyChart from '../gift-cards/virtual/GiftCardMonthlyChart';
import { ReferralConversionChart, ReferralMonthlyChart } from '../referrals/ReferralCharts';
import LiabilityChart from './LiabilityChart';
import LoyaltyInsights from './LoyaltyInsights';
import LoyaltyKpis from './LoyaltyKpis';
import { useLoyaltyOverview } from './useLoyaltyOverview';

/**
 * The Loyalty console's home, kept brief: what Duncit owes in rewards across
 * coins, virtual and printed gift cards, how the referral programme converts,
 * a few plain-words insights, and the month-by-month picture of each book.
 * No greeting or account card — this page is about the rewards, not the reader.
 */
export default function DashboardPage() {
  const { t } = useTranslation();
  const [months, setMonths] = useMonthsParam();
  const overview = useLoyaltyOverview(months);
  const { coins, cards, loading } = overview;

  const chart = (id: string, x: number, y: number, w: number, content: DashboardWidget['content']): DashboardWidget => ({
    id,
    bare: true,
    defaultLayout: { x, y, w, h: 6 },
    minW: 3,
    minH: 4,
    content,
  });

  const widgets: DashboardWidget[] = [
    {
      id: 'loyalty-kpis',
      bare: true,
      // Eight tiles wrap with the viewport — the height follows them.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <LoyaltyKpis overview={overview} />,
    },
    chart('loyalty-insights', 0, 2, 7, <LoyaltyInsights overview={overview} months={months} />),
    chart('loyalty-liability', 7, 2, 5, <LiabilityChart overview={overview} />),
    chart('loyalty-coin-monthly', 0, 8, 6, <CoinMonthlyChart buckets={coins?.monthly ?? []} loading={loading.coins} />),
    chart(
      'loyalty-referral-monthly',
      6,
      8,
      6,
      <ReferralMonthlyChart buckets={overview.referrals?.monthly ?? []} loading={loading.referrals} />
    ),
    chart('loyalty-card-monthly', 0, 14, 8, <GiftCardMonthlyChart buckets={cards?.monthly ?? []} loading={loading.cards} />),
    chart('loyalty-referral-conversion', 8, 14, 4, <ReferralConversionChart stats={overview.referrals} loading={loading.referrals} />),
  ];

  return (
    <DuncitDashboard
      dashboardId="loyalty.home"
      header={
        <DashboardHeader
          icon={<InsightsIcon color="primary" />}
          title={t('loyalty.dashboard.title')}
          subtitle={t('loyalty.dashboard.subtitle')}
          months={months}
          onMonthsChange={setMonths}
          periodLabel={t('loyalty.common.period')}
          monthsLabel={(n) => t('loyalty.common.lastMonths', { vars: { n } })}
          errorText={overview.failed ? t('loyalty.common.loadError') : null}
        />
      }
      widgets={widgets}
    />
  );
}
