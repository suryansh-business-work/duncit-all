import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from '@duncit/app-settings';
import DoughnutCard from '../../components/DoughnutCard';
import MonthlyBarChart from '../../components/MonthlyBarChart';
import { coinCount } from '../duncit-coin/queries';
import type { SmartIncentiveDiscountShare, SmartIncentiveMonthBucket } from './queries';

interface MonthlyProps {
  buckets: SmartIncentiveMonthBucket[];
  loading: boolean;
}

/** Offers the pod pages showed each month, beside the bookings paid with one. */
export function SmartIncentiveOffersChart({ buckets, loading }: Readonly<MonthlyProps>) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  return (
    <MonthlyBarChart
      title={t('loyalty.smartIncentive.monthlyTitle')}
      caption={t('loyalty.smartIncentive.monthlyCaption')}
      ariaLabel={t('loyalty.smartIncentive.monthlyTitle')}
      buckets={buckets}
      series={[
        { label: t('loyalty.smartIncentive.chartOffers'), value: (b) => b.offers, color: palette.info.main },
        { label: t('loyalty.smartIncentive.chartBookings'), value: (b) => b.bookings, color: palette.success.main },
      ]}
      loading={loading}
      emptyText={t('loyalty.smartIncentive.monthlyEmpty')}
    />
  );
}

/** What the bookings paid with an offer took off ticket money, month by month. */
export function SmartIncentiveDiscountChart({ buckets, loading }: Readonly<MonthlyProps>) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  return (
    <MonthlyBarChart
      title={t('loyalty.smartIncentive.discountChartTitle')}
      caption={t('loyalty.smartIncentive.discountChartCaption')}
      ariaLabel={t('loyalty.smartIncentive.discountChartTitle')}
      buckets={buckets}
      series={[{ label: t('loyalty.smartIncentive.chartDiscount'), value: (b) => b.discount, color: palette.warning.main }]}
      loading={loading}
      emptyText={t('loyalty.smartIncentive.monthlyEmpty')}
    />
  );
}

interface SplitProps {
  shares: SmartIncentiveDiscountShare[];
  /** The programme's cap: the top of the colour scale. */
  maxPct: number;
  loading: boolean;
}

/** The faintest tint a slice gets, so the smallest discount still stands out from the card. */
const MIN_TINT = 0.35;

/**
 * Opted-in pods by the discount their host chose. Discounts are ordered, so the
 * slices are one hue that deepens with the percentage. The tint is read off the
 * value, not the slice's position, so a 10% slice keeps its colour whatever
 * else is on the chart.
 */
export function SmartIncentiveSplitChart({ shares, maxPct, loading }: Readonly<SplitProps>) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  // A pod still above a lowered cap keeps its discount, so the scale stretches to reach it.
  const top = Math.max(1, maxPct, ...shares.map((share) => share.discount_pct));

  return (
    <DoughnutCard
      title={t('loyalty.smartIncentive.splitTitle')}
      caption={t('loyalty.smartIncentive.splitCaption')}
      ariaLabel={t('loyalty.smartIncentive.splitTitle')}
      slices={shares.map((share) => ({
        label: t('loyalty.smartIncentive.splitSlice', { vars: { pct: share.discount_pct } }),
        value: share.pods,
        color: alpha(palette.primary.main, MIN_TINT + (1 - MIN_TINT) * (share.discount_pct / top)),
      }))}
      loading={loading}
      emptyText={t('loyalty.smartIncentive.splitEmpty')}
      formatValue={coinCount}
    />
  );
}
