import { useQuery } from '@apollo/client/react';
import { Alert, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import SavingsIcon from '@mui/icons-material/Savings';
import { StatCard } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { COIN_ADMIN_STATS, type CoinAdminStats } from '../duncit-coin/queries';
import { GIFT_CARD_ADMIN_STATS, type GiftCardAdminStats } from '../gift-cards/virtual/queries';
import { PHYSICAL_STATS, type PhysicalStats } from '../gift-cards/physical/queries';
import { formatCoins } from '../gift-cards/physical/labels';

/** The window the headline figures are read over — the dashboards' default. */
const MONTHS = 12;

/**
 * What the platform owes in rewards right now, across all three books: coins
 * members hold, virtual card value not yet converted, and printed coins not yet
 * redeemed. Each tile opens its own dashboard.
 */
export default function LoyaltyKpis() {
  const { t } = useTranslation();
  const theme = useTheme();
  const options = { variables: { months: MONTHS }, fetchPolicy: 'cache-and-network' as const };
  const coin = useQuery<{ coinAdminStats: CoinAdminStats }>(COIN_ADMIN_STATS, options);
  const virtual = useQuery<{ giftCardAdminStats: GiftCardAdminStats }>(GIFT_CARD_ADMIN_STATS, options);
  const physical = useQuery<{ physicalGiftCardAdminStats: PhysicalStats }>(PHYSICAL_STATS, options);

  const coins = coin.data?.coinAdminStats;
  const cards = virtual.data?.giftCardAdminStats;
  const printed = physical.data?.physicalGiftCardAdminStats;
  const failed = Boolean(coin.error || virtual.error || physical.error);

  const tiles = [
    {
      key: 'coins',
      label: t('loyalty.dashboard.coinsOutstanding'),
      value: coins ? formatCoins(coins.total_outstanding) : '—',
      loading: coin.loading && !coins,
      icon: MonetizationOnIcon,
      color: theme.palette.primary.main,
      to: '/duncit-coin/dashboard',
    },
    {
      key: 'virtual',
      label: t('loyalty.dashboard.virtualOutstanding'),
      value: cards ? formatMoney(cards.outstanding_value, { symbol: cards.currency_symbol }) : '—',
      loading: virtual.loading && !cards,
      icon: CardGiftcardIcon,
      color: theme.palette.secondary.main,
      to: '/gift-cards/virtual/dashboard',
    },
    {
      key: 'physical',
      label: t('loyalty.dashboard.physicalOutstanding'),
      value: printed ? formatCoins(printed.outstanding_coins) : '—',
      loading: physical.loading && !printed,
      icon: SavingsIcon,
      color: theme.palette.warning.main,
      to: '/gift-cards/physical/dashboard',
    },
    {
      key: 'generated',
      label: t('loyalty.dashboard.physicalGenerated'),
      value: printed ? formatCoins(printed.generated_count) : '—',
      loading: physical.loading && !printed,
      icon: ConfirmationNumberIcon,
      color: theme.palette.info.main,
      to: '/gift-cards/physical/cards',
    },
  ];

  return (
    <Grid container spacing={2}>
      {failed && (
        <Grid size={12}>
          <Alert severity="error">{t('loyalty.common.loadError')}</Alert>
        </Grid>
      )}
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Grid key={tile.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              layout="split"
              label={tile.label}
              value={tile.value}
              valueVariant="h5"
              loading={tile.loading}
              icon={<Icon fontSize="small" />}
              iconBox={{ color: tile.color, alpha: 0.1, size: 40, radius: 1.5 }}
              to={tile.to}
              cardVariant="elevation"
              sx={{ height: '100%' }}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}
