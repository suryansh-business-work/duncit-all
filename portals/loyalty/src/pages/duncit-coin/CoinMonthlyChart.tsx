import { useTheme } from '@mui/material/styles';
import { useTranslation } from '@duncit/app-settings';
import MonthlyBarChart from '../../components/MonthlyBarChart';
import type { CoinMonthBucket } from './queries';

interface Props {
  buckets: CoinMonthBucket[];
  loading: boolean;
}

/** Coins earned on payments against coins spent at checkout, month by month. */
export default function CoinMonthlyChart({ buckets, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <MonthlyBarChart
      title={t('loyalty.coin.monthlyTitle')}
      caption={t('loyalty.coin.monthlyCaption')}
      ariaLabel={t('loyalty.coin.monthlyTitle')}
      buckets={buckets}
      series={[
        { label: t('finance.duncitCoin.earned'), value: (b) => b.earned, color: theme.palette.primary.main },
        { label: t('finance.duncitCoin.redeemed'), value: (b) => b.redeemed, color: theme.palette.warning.main },
      ]}
      loading={loading}
      emptyText={t('loyalty.coin.monthlyEmpty')}
    />
  );
}
