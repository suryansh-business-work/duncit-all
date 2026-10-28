import { useQuery } from '@apollo/client/react';
import { useTheme } from '@mui/material/styles';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { useTranslation } from '@duncit/app-settings';
import DashboardHeader from '../../../components/DashboardHeader';
import MonthlyBarChart from '../../../components/MonthlyBarChart';
import { useMonthsParam } from '../../../lib/useMonthsParam';
import PhysicalStatTiles from './PhysicalStatTiles';
import { GenerateCardsButton } from './PhysicalListPages';
import { PHYSICAL_STATS, type PhysicalStats } from './queries';

/**
 * Loyalty > Physical Gift Cards > Dashboard — every printed coin and where it
 * is now: redeemed, still owed on a live card, lapsed, or cancelled — and coins
 * printed against coins redeemed, month by month.
 */
export default function PhysicalDashboardPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [months, setMonths] = useMonthsParam();
  const { data, loading, error } = useQuery<{ physicalGiftCardAdminStats: PhysicalStats }>(PHYSICAL_STATS, {
    variables: { months },
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.physicalGiftCardAdminStats;

  const widgets: DashboardWidget[] = [
    {
      id: 'physical-tiles',
      bare: true,
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <PhysicalStatTiles stats={stats} loading={loading} />,
    },
    {
      id: 'physical-monthly',
      bare: true,
      defaultLayout: { x: 0, y: 2, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: (
        <MonthlyBarChart
          title={t('loyalty.physical.monthlyTitle')}
          ariaLabel={t('loyalty.physical.monthlyTitle')}
          buckets={stats?.monthly ?? []}
          series={[
            { label: t('loyalty.physical.chartGenerated'), value: (b) => b.generated, color: theme.palette.primary.main },
            { label: t('loyalty.physical.chartRedeemed'), value: (b) => b.redeemed, color: theme.palette.warning.main },
          ]}
          loading={loading}
          emptyText={t('loyalty.physical.monthlyEmpty')}
        />
      ),
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="loyalty.physical"
      header={
        <DashboardHeader
          icon={<ConfirmationNumberIcon color="primary" />}
          title={t('loyalty.physical.dashboardTitle')}
          subtitle={t('loyalty.physical.dashboardSubtitle')}
          months={months}
          onMonthsChange={setMonths}
          periodLabel={t('loyalty.common.period')}
          monthsLabel={(n) => t('loyalty.common.lastMonths', { vars: { n } })}
          errorText={error ? t('loyalty.common.loadError') : null}
        >
          <GenerateCardsButton />
        </DashboardHeader>
      }
      widgets={widgets}
    />
  );
}
