import { Link as RouterLink } from 'react-router';
import { Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProductOrder } from '../pod-history-page/productOrders';

type OrderFacts = Pick<ProductOrder, 'id' | 'order_no' | 'created_at' | 'total' | 'currency_symbol'>;

/** The top of an order card on My Product Orders: when it was placed, what it
 * came to, and the way into its detail page — a real link, so it is reachable
 * by keyboard and opens in a new tab like any other.
 * Native twin: components/orders-history/OrderCardHeader (rule 27). */
export default function OrderCardHeader({ order }: Readonly<{ order: OrderFacts }>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
      <Typography
        variant="caption"
        sx={{ flex: 1, minWidth: 0, color: 'text.secondary' }}
        data-testid={`orders-history-meta-${order.id}`}
      >
        {t('mweb.orderDetail.placedOn', { vars: { date: formatDate(order.created_at) } })}
        {' · '}
        {t('mweb.orderDetail.total', { vars: { amount: formatMoney(order.total, { symbol: order.currency_symbol }) } })}
      </Typography>
      <DuncitButton
        component={RouterLink}
        to={`/orders/${order.id}`}
        size="small"
        endIcon={<ChevronRightRoundedIcon />}
        aria-label={t('mweb.orderDetail.openOrder', { vars: { orderNo: order.order_no } })}
        data-testid={`orders-history-view-${order.id}`}
      >
        {t('mweb.orderDetail.viewDetails')}
      </DuncitButton>
    </Stack>
  );
}
