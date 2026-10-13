import { Divider, Stack, Typography } from '@mui/material';
import { FOOD_PAYMENT_STATUS_KEYS, formatFoodMoney, type VenueFoodOrder } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';
import { useDateFormat } from '../../utils/dateFormat';
import DietMark from '../VenueDetailsPage/food/DietMark';
import FoodTotals from '../VenueDetailsPage/food/FoodTotals';

function Detail({ label, value, testId }: Readonly<{ label: string; value: string; testId: string }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
      <Typography component="dt" variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography component="dd" variant="body2" sx={{ m: 0, fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }} data-testid={testId}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * What was ordered and what it came to — as the server priced it — then who
 * it is for: payment, name, table, note and when it was placed.
 */
export default function FoodOrderSummary({ order }: Readonly<{ order: VenueFoodOrder }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const money = (amount: number) => formatFoodMoney(amount, order.currency_symbol);

  return (
    <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }} data-testid="food-order-summary">
      <SectionHeader testId="food-order-items-header" title={t('mweb.venueFood.order.items')} />
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {order.items.map((line) => (
          <Stack key={line.item_id} component="li" direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <DietMark diet={line.diet} />
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                {line.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('mweb.venueFood.cart.qtyPrice', { vars: { qty: String(line.quantity), price: money(line.unit_price) } })}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {money(line.line_total)}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <FoodTotals
        subtotal={order.subtotal}
        discount={order.discount_amount}
        discountPct={order.discount_pct}
        total={order.total}
        currency={order.currency_symbol}
        testId="food-order-totals"
      />
      <Divider />
      <SectionHeader testId="food-order-details-header" title={t('mweb.venueFood.order.details')} />
      <Stack component="dl" spacing={0.75} sx={{ m: 0 }}>
        <Detail
          label={t('mweb.venueFood.order.paymentStatus')}
          value={t(FOOD_PAYMENT_STATUS_KEYS[order.payment_status])}
          testId="food-order-payment-status"
        />
        <Detail label={t('mweb.venueFood.order.name')} value={order.customer_name} testId="food-order-name" />
        {order.table_label && <Detail label={t('mweb.venueFood.order.table')} value={order.table_label} testId="food-order-table" />}
        {order.note && <Detail label={t('mweb.venueFood.order.note')} value={order.note} testId="food-order-note" />}
        <Detail label={t('mweb.venueFood.order.placedAt')} value={formatDateTime(order.created_at)} testId="food-order-placed-at" />
      </Stack>
    </Stack>
  );
}
