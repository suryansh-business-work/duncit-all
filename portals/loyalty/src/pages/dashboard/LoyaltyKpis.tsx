import { useTheme } from '@mui/material/styles';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PercentIcon from '@mui/icons-material/Percent';
import SavingsIcon from '@mui/icons-material/Savings';
import { EM_DASH } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import StatTileGrid, { type StatTile } from '../../components/StatTileGrid';
import { coinCount } from '../duncit-coin/queries';
import { totalLiability, type LoyaltyOverview } from './useLoyaltyOverview';

/**
 * The Loyalty home's headline numbers: what Duncit owes in rewards across all
 * three books (and in total), who holds coins, and how the referral programme
 * is converting. Each tile opens the dashboard behind it.
 */
export default function LoyaltyKpis({ overview }: Readonly<{ overview: LoyaltyOverview }>) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { coins, cards, printed, referrals, loading } = overview;
  const liability = totalLiability(overview);
  const symbol = cards?.currency_symbol ?? coins?.currency_symbol ?? '';

  const tiles: StatTile[] = [
    {
      key: 'liability',
      label: t('loyalty.dashboard.totalLiability'),
      value: liability == null ? EM_DASH : formatMoney(liability, { symbol }),
      hint: t('loyalty.dashboard.totalLiabilityHint'),
      loading: loading.coins || loading.cards || loading.printed,
      icon: AccountBalanceWalletIcon,
      color: palette.error.main,
      to: '/duncit-coin/dashboard',
    },
    {
      key: 'coins',
      label: t('loyalty.dashboard.coinsOutstanding'),
      value: coins ? coinCount(coins.total_outstanding) : EM_DASH,
      loading: loading.coins,
      icon: MonetizationOnIcon,
      color: palette.primary.main,
      to: '/duncit-coin/dashboard',
    },
    {
      key: 'virtual',
      label: t('loyalty.dashboard.virtualOutstanding'),
      value: cards ? formatMoney(cards.outstanding_value, { symbol: cards.currency_symbol }) : EM_DASH,
      loading: loading.cards,
      icon: CardGiftcardIcon,
      color: palette.secondary.main,
      to: '/gift-cards/virtual/dashboard',
    },
    {
      key: 'physical',
      label: t('loyalty.dashboard.physicalOutstanding'),
      value: printed ? coinCount(printed.outstanding_coins) : EM_DASH,
      loading: loading.printed,
      icon: SavingsIcon,
      color: palette.warning.main,
      to: '/gift-cards/physical/dashboard',
    },
    {
      key: 'holders',
      label: t('loyalty.dashboard.coinHolders'),
      value: coins ? coinCount(coins.holders_count) : EM_DASH,
      loading: loading.coins,
      icon: GroupsIcon,
      color: palette.info.main,
      to: '/duncit-coin/transactions',
    },
    {
      key: 'referrals',
      label: t('loyalty.dashboard.referralsJoined'),
      value: referrals ? coinCount(referrals.total_referrals) : EM_DASH,
      loading: loading.referrals,
      icon: GroupAddIcon,
      color: palette.success.main,
      to: '/referrals/dashboard',
    },
    {
      key: 'conversion',
      label: t('loyalty.dashboard.referralConversion'),
      value: referrals ? `${referrals.conversion_pct}%` : EM_DASH,
      loading: loading.referrals,
      icon: PercentIcon,
      color: palette.primary.dark,
      to: '/referrals/dashboard',
    },
    {
      key: 'awaiting',
      label: t('loyalty.dashboard.referralsAwaiting'),
      value: referrals ? coinCount(referrals.awaiting_first_payment) : EM_DASH,
      loading: loading.referrals,
      icon: HourglassEmptyIcon,
      color: palette.grey[600],
      to: '/referrals/history',
    },
  ];

  return <StatTileGrid tiles={tiles} testIdPrefix="loyalty-kpi" />;
}
