import { useQuery } from '@apollo/client/react';
import { useTheme } from '@mui/material/styles';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintIcon from '@mui/icons-material/Print';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import StatTileGrid, { type StatTile } from '../../../components/StatTileGrid';
import { useCurrencySymbol } from '../../../lib/useCurrencySymbol';
import { GIFT_CARD_ORDER_STATS, GIFT_ORDER_CURRENCY, type GiftCardOrderStats } from './queries';

/** The order book at a glance: what was sold, and what is waiting on the team. */
export default function OrderStatTiles() {
  const { t } = useTranslation();
  const theme = useTheme();
  const symbol = useCurrencySymbol(GIFT_ORDER_CURRENCY);
  const { data, loading } = useQuery<{ giftCardOrderStats: GiftCardOrderStats }>(GIFT_CARD_ORDER_STATS, {
    fetchPolicy: 'cache-and-network',
  });
  const s = data?.giftCardOrderStats;
  const count = (n?: number) => String(n ?? 0);
  const tiles: StatTile[] = [
    {
      key: 'paid',
      label: t('loyalty.giftOrders.tilePaid'),
      value: formatMoney(s?.paid_value ?? 0, { symbol }),
      hint: t('loyalty.giftOrders.tilePaidHint', { vars: { n: count(s?.paid_orders), pending: count(s?.pending_payment) } }),
      loading,
      icon: PaymentsIcon,
      color: theme.palette.success.main,
    },
    {
      key: 'print',
      label: t('loyalty.giftOrders.tileToPrint'),
      value: count(s?.to_print),
      hint: t('loyalty.giftOrders.tileToShipHint', { vars: { n: count(s?.to_ship) } }),
      loading,
      icon: PrintIcon,
      color: theme.palette.warning.main,
    },
    {
      key: 'transit',
      label: t('loyalty.giftOrders.tileInTransit'),
      value: count(s?.in_transit),
      hint: t('loyalty.giftOrders.tileAttentionHint', { vars: { n: count(s?.needs_attention) } }),
      loading,
      icon: LocalShippingIcon,
      color: theme.palette.info.main,
    },
    {
      key: 'delivered',
      label: t('loyalty.giftOrders.tileDelivered'),
      value: count(s?.delivered),
      hint: t('loyalty.giftOrders.tileReturnedHint', { vars: { n: count(s?.returned_or_lost) } }),
      loading,
      icon: TaskAltIcon,
      color: theme.palette.primary.main,
    },
  ];
  return <StatTileGrid tiles={tiles} testIdPrefix="gift-order-tile" />;
}
