import { useTheme } from '@mui/material/styles';
import { useTranslation } from '@duncit/app-settings';
import MonthlyBarChart from '../../../components/MonthlyBarChart';
import type { GiftCardMonthBucket } from './queries';

interface Props {
  buckets: GiftCardMonthBucket[];
  loading: boolean;
}

/** Virtual card value sold against value converted to coins, month by month. */
export default function GiftCardMonthlyChart({ buckets, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <MonthlyBarChart
      title={t('finance.giftCards.monthlyTitle')}
      ariaLabel={t('finance.giftCards.monthlyTitle')}
      buckets={buckets}
      series={[
        { label: t('finance.giftCards.chartSold'), value: (b) => b.sold, color: theme.palette.primary.main },
        { label: t('finance.giftCards.chartRedeemed'), value: (b) => b.redeemed, color: theme.palette.warning.main },
      ]}
      loading={loading}
      emptyText={t('finance.giftCards.logsEmpty')}
    />
  );
}
