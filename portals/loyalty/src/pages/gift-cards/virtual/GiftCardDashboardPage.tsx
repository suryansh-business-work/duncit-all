import { useQuery } from '@apollo/client/react';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { useTranslation } from '@duncit/app-settings';
import DashboardHeader from '../../../components/DashboardHeader';
import { useMonthsParam } from '../../../lib/useMonthsParam';
import GiftCardMonthlyChart from './GiftCardMonthlyChart';
import GiftCardSettingsCard from './GiftCardSettingsCard';
import GiftCardStatTiles from './GiftCardStatTiles';
import { GIFT_CARD_ADMIN_STATS, type GiftCardAdminStats } from './queries';

/** Loyalty > Virtual Gift Cards > Dashboard — what was sold, what turned into
 * coins, what the platform still owes, and the sales policy. */
export default function GiftCardDashboardPage() {
  const { t } = useTranslation();
  const [months, setMonths] = useMonthsParam();

  const { data, loading, error } = useQuery<{ giftCardAdminStats: GiftCardAdminStats }>(GIFT_CARD_ADMIN_STATS, {
    variables: { months },
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.giftCardAdminStats;

  const widgets: DashboardWidget[] = [
    {
      id: 'gift-card-tiles',
      bare: true,
      // Five tiles wrap on smaller screens — h2 would show one cut row.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <GiftCardStatTiles stats={stats} loading={loading} />,
    },
    {
      id: 'gift-card-monthly',
      bare: true,
      defaultLayout: { x: 0, y: 2, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: <GiftCardMonthlyChart buckets={stats?.monthly ?? []} loading={loading} />,
    },
    {
      id: 'gift-card-settings',
      bare: true,
      fitContent: true,
      defaultLayout: { x: 0, y: 8, w: 6, h: 5 },
      minW: 4,
      minH: 3,
      content: <GiftCardSettingsCard />,
    },
  ];

  return (
    <DuncitDashboard
      // Kept from the Finance console, so the layout each person arranged there carries over.
      dashboardId="finance.giftcards"
      header={
        <DashboardHeader
          icon={<CardGiftcardIcon color="primary" />}
          title={t('finance.giftCards.dashboardTitle')}
          months={months}
          onMonthsChange={setMonths}
          periodLabel={t('finance.giftCards.periodLabel')}
          monthsLabel={(n) => t('finance.giftCards.months', { vars: { n } })}
          errorText={error?.message}
        />
      }
      widgets={widgets}
    />
  );
}
