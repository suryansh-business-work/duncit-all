import { useTheme } from '@mui/material/styles';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PercentIcon from '@mui/icons-material/Percent';
import SavingsIcon from '@mui/icons-material/Savings';
import { EM_DASH } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import StatTileGrid, { type StatTile } from '../../components/StatTileGrid';
import { coinCount } from '../duncit-coin/queries';
import type { SmartIncentiveAdminStats } from './queries';

interface Props {
  stats?: SmartIncentiveAdminStats;
  /** The admin-configured currency symbol the discount is shown in. */
  symbol: string;
  loading: boolean;
}

/** A count, or a dash until the stats are in. */
const count = (value?: number): string => (value == null ? EM_DASH : coinCount(value));

/** A percentage the server already rounded to one decimal, or a dash until the stats are in. */
const percent = (value?: number): string => (value == null ? EM_DASH : `${value}%`);

/**
 * Smart Incentive's headline numbers: who opted in and at what discount, the
 * offers shown and how many became bookings, and what the hosts gave away. Only
 * the average discount opens a page — Settings, where its maximum is set.
 */
export default function SmartIncentiveStatTiles({ stats, symbol, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const { palette } = useTheme();

  const tiles: Omit<StatTile, 'loading'>[] = [
    {
      key: 'hosts',
      label: t('loyalty.smartIncentive.tileHosts'),
      value: count(stats?.hosts_opted_in),
      hint: t('loyalty.smartIncentive.tileHostsHint', {
        vars: { pods: count(stats?.pods_opted_in), upcoming: count(stats?.upcoming_pods) },
      }),
      icon: GroupsIcon,
      color: palette.primary.main,
    },
    {
      key: 'avg-discount',
      label: t('loyalty.smartIncentive.tileAvgDiscount'),
      value: percent(stats?.avg_discount_pct),
      hint: t('loyalty.smartIncentive.tileAvgDiscountHint', { vars: { max: stats?.max_discount_pct ?? EM_DASH } }),
      icon: PercentIcon,
      color: palette.secondary.main,
      to: '/smart-incentive/settings',
    },
    {
      key: 'offers',
      label: t('loyalty.smartIncentive.tileOffers'),
      value: count(stats?.offers_shown),
      hint: t('loyalty.smartIncentive.tileOffersHint'),
      icon: LocalOfferIcon,
      color: palette.info.main,
    },
    {
      key: 'bookings',
      label: t('loyalty.smartIncentive.tileBookings'),
      value: count(stats?.bookings),
      hint: t('loyalty.smartIncentive.tileBookingsHint', { vars: { pct: stats?.conversion_pct ?? EM_DASH } }),
      icon: EventAvailableIcon,
      color: palette.success.main,
    },
    {
      key: 'discount',
      label: t('loyalty.smartIncentive.tileDiscount'),
      value: stats ? formatMoney(stats.discount_given, { symbol }) : EM_DASH,
      hint: t('loyalty.smartIncentive.tileDiscountHint'),
      icon: SavingsIcon,
      color: palette.warning.main,
    },
  ];

  return (
    <StatTileGrid tiles={tiles.map((tile) => ({ ...tile, loading }))} testIdPrefix="smart-incentive-tile" />
  );
}
