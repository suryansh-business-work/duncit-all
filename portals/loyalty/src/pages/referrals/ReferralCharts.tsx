import { useTheme } from '@mui/material/styles';
import { useTranslation } from '@duncit/app-settings';
import MonthlyBarChart from '../../components/MonthlyBarChart';
import DoughnutCard from '../../components/DoughnutCard';
import { coinCount } from '../duncit-coin/queries';
import type { ReferralAdminStats, ReferralMonthBucket } from './queries';

interface MonthlyProps {
  buckets: ReferralMonthBucket[];
  loading: boolean;
}

/** Members who joined with a code against those of them who have paid since, month by month. */
export function ReferralMonthlyChart({ buckets, loading }: Readonly<MonthlyProps>) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  return (
    <MonthlyBarChart
      title={t('loyalty.referrals.monthlyTitle')}
      caption={t('loyalty.referrals.monthlyCaption')}
      ariaLabel={t('loyalty.referrals.monthlyTitle')}
      buckets={buckets}
      series={[
        { label: t('loyalty.referrals.chartJoined'), value: (b) => b.joined, color: palette.info.main },
        { label: t('loyalty.referrals.chartConverted'), value: (b) => b.converted, color: palette.success.main },
      ]}
      loading={loading}
      emptyText={t('loyalty.referrals.monthlyEmpty')}
    />
  );
}

/** Referral coins credited per month, both sides together. */
export function ReferralCoinsChart({ buckets, loading }: Readonly<MonthlyProps>) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  return (
    <MonthlyBarChart
      title={t('loyalty.referrals.coinsChartTitle')}
      caption={t('loyalty.referrals.coinsChartCaption')}
      ariaLabel={t('loyalty.referrals.coinsChartTitle')}
      buckets={buckets}
      series={[{ label: t('loyalty.referrals.chartCoins'), value: (b) => b.coins, color: palette.warning.main }]}
      loading={loading}
      emptyText={t('loyalty.referrals.monthlyEmpty')}
    />
  );
}

interface StatsProps {
  stats?: ReferralAdminStats;
  loading: boolean;
}

/** Of everyone who joined with a code: how many have paid, how many have not yet. */
export function ReferralConversionChart({ stats, loading }: Readonly<StatsProps>) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  return (
    <DoughnutCard
      title={t('loyalty.referrals.conversionTitle')}
      caption={t('loyalty.referrals.conversionCaption')}
      ariaLabel={t('loyalty.referrals.conversionTitle')}
      slices={[
        { label: t('loyalty.referrals.tileConverted'), value: stats?.converted ?? 0, color: palette.success.main },
        { label: t('loyalty.referrals.tileAwaiting'), value: stats?.awaiting_first_payment ?? 0, color: palette.warning.main },
      ]}
      loading={loading && !stats}
      emptyText={t('loyalty.referrals.monthlyEmpty')}
      formatValue={coinCount}
    />
  );
}

/** Whether every referral's coins landed on both sides. */
export function ReferralPayoutChart({ stats, loading }: Readonly<StatsProps>) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  return (
    <DoughnutCard
      title={t('loyalty.referrals.payoutTitle')}
      caption={t('loyalty.referrals.payoutCaption')}
      ariaLabel={t('loyalty.referrals.payoutTitle')}
      slices={[
        { label: t('loyalty.referrals.payoutPaid'), value: stats?.payouts_paid ?? 0, color: palette.success.main },
        { label: t('loyalty.referrals.payoutPartial'), value: stats?.payouts_partial ?? 0, color: palette.warning.main },
        { label: t('loyalty.referrals.payoutUnpaid'), value: stats?.payouts_unpaid ?? 0, color: palette.error.main },
      ]}
      loading={loading && !stats}
      emptyText={t('loyalty.referrals.monthlyEmpty')}
      formatValue={coinCount}
    />
  );
}
