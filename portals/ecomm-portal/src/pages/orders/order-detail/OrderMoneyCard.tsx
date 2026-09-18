import { Divider, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { EM_DASH } from '@duncit/table';
import { SectionCard } from '@duncit/ui';
import InfoRows, { type InfoLine } from '../../../components/InfoRows';
import { money } from '../../../lib/format';
import type { Translate } from '../../../lib/translate';
import type { StoreAdminPayment, StoreOrder } from '../queries';

type Money = (value: number) => string;

function orderLines(order: StoreOrder, t: Translate, m: Money, formatDateTime: (iso: string) => string): InfoLine[] {
  const lines: InfoLine[] = [
    { key: 'items', label: t('ecommPortal.orders.itemsTotal'), value: m(order.items_total) },
    { key: 'shipping', label: t('ecommPortal.orders.shipping'), value: m(order.shipping_charge) },
    { key: 'total', label: t('ecommPortal.orders.orderTotal'), value: m(order.total) },
    { key: 'discount', label: t('ecommPortal.orders.discounts'), value: m(-order.discount_total) },
    { key: 'charged', label: t('ecommPortal.orders.charged'), value: m(order.total - order.discount_total), bold: true },
  ];
  if (order.payment_method !== 'COD') return lines;
  const collected = order.cod_collected_at ? formatDateTime(order.cod_collected_at) : t('ecommPortal.orders.notYet');
  return [
    ...lines,
    { key: 'cod', label: t('ecommPortal.orders.codAmount'), value: m(order.cod_amount) },
    { key: 'codCollected', label: t('ecommPortal.orders.codCollectedAt'), value: collected },
  ];
}

function paymentLines(payment: StoreAdminPayment, t: Translate, m: Money, formatDateTime: (iso: string) => string): InfoLine[] {
  const coupon = payment.coupon_code ? `${payment.coupon_code} (${m(-payment.coupon_discount)})` : EM_DASH;
  return [
    { key: 'gateway', label: t('ecommPortal.orders.gateway'), value: payment.gateway || EM_DASH },
    { key: 'paymentId', label: t('ecommPortal.orders.paymentId'), value: payment.payment_id || EM_DASH },
    { key: 'invoice', label: t('ecommPortal.orders.invoiceNo'), value: payment.invoice_no || EM_DASH },
    { key: 'status', label: t('shell.common.status'), value: payment.status },
    { key: 'coupon', label: t('ecommPortal.orders.coupon'), value: coupon },
    { key: 'coins', label: t('ecommPortal.orders.coinsRedeemed'), value: String(payment.coins_redeemed) },
    { key: 'prepaid', label: t('ecommPortal.orders.prepaidDiscount'), value: m(payment.prepaid_discount) },
    { key: 'codFee', label: t('ecommPortal.orders.codFee'), value: m(payment.cod_fee) },
    { key: 'refunded', label: t('ecommPortal.orders.refunded'), value: m(payment.refunded_amount), bold: payment.refunded_amount > 0 },
    { key: 'paidAt', label: t('ecommPortal.orders.paidAt'), value: payment.paid_at ? formatDateTime(payment.paid_at) : EM_DASH },
    { key: 'paymentTotal', label: t('ecommPortal.orders.paymentTotal'), value: m(payment.total) },
  ];
}

/** Where the order's money came from and where it stands: the order's own sums, then the payment behind it. */
export default function OrderMoneyCard({ order, payment }: Readonly<{ order: StoreOrder; payment: StoreAdminPayment | null }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const m: Money = (value) => money(value, order.currency_symbol);
  return (
    <SectionCard title={t('ecommPortal.orders.money')}>
      <InfoRows lines={orderLines(order, t, m, formatDateTime)} />
      <Divider sx={{ my: 2 }} />
      <Stack spacing={1}>
        <Typography component="h3" variant="subtitle2">
          {t('ecommPortal.orders.paymentPanel')}
        </Typography>
        {payment ? (
          <InfoRows lines={paymentLines(payment, t, m, formatDateTime)} />
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('ecommPortal.orders.noPayment')}
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
}
