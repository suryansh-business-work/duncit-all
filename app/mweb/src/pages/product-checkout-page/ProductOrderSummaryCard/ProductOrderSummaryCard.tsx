import { Card, Divider, Stack, Typography } from '@mui/material';
import { cartLineKey, type CartLine } from '../../../components/cart/CartContext';
import { formatMoney } from '../../checkout-page/checkoutMath';
import { useTranslation } from '../../../i18n/useTranslation';
import type { ProductShippingQuote } from '../../checkout-page/queries';
import CoinSummaryRows from '../../checkout-page/CoinSummaryRows';
import type { CoinCheckoutSummary } from '@duncit/utils';
import Row from './Row';
import LineRow from './LineRow';
import DeliveryRows from './DeliveryRows';

interface Props {
  /** Coins spent, left and earned on this bill. Absent hides the coin block. */
  coins?: CoinCheckoutSummary | null;
  lines: CartLine[];
  breakup: any;
  subtotal: number;
  quote: ProductShippingQuote | null;
  shippingLoading: boolean;
  pincodeValid: boolean;
  /** Opens the product-detail dialog for a line. Products and Pods are separate
   * entities — the checkout lists products only, each with an info button. */
  onInfo: (productId: string) => void;
  /** What rounding the charge up to a whole rupee adds. Zero hides the row. */
  roundOff?: number;
  /** What is actually charged — after the coupon, the round-off and the coins.
   * Absent falls back to the undiscounted bill. */
  payable?: number;
}

/** Product-only order summary for the combined product checkout: a flat product
 * line list (each with an info button), products subtotal, per-warehouse
 * delivery (ShipRocket) and the payable total. No pod title / "Event ticket"
 * line — pods and products are separate entities and never share a payment. */
export default function ProductOrderSummaryCard({ lines, breakup, subtotal, quote, shippingLoading, pincodeValid, onInfo, coins = null, roundOff = 0, payable }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const estimated = !!quote && !quote.all_quoted;

  return (
    <Card data-testid="product-order-summary-card" sx={{ flex: 1, p: 2 }}>
      <Typography component="h2" sx={{ fontSize: '1.0625rem', fontWeight: 600 }}>
        {t('mweb.checkout.yourOrder')}
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        {lines.map((line) => (
          <LineRow key={`${line.pod_id}:${cartLineKey(line)}`} line={line} fmt={fmt} onInfo={onInfo} />
        ))}
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Stack spacing={1}>
        <Row testId="product-order-summary-card-subtotal" label={t('mweb.checkout.subtotal')} value={fmt(subtotal)} />
        <DeliveryRows quote={quote} shippingLoading={shippingLoading} pincodeValid={pincodeValid} currency={breakup.currency} />
        {estimated && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('mweb.checkout.deliveryEstimatedNote')}
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: 'text.secondary', pt: 0.5 }}>
          {t('mweb.checkout.inclusiveOf')}
        </Typography>
        <Row
          testId="product-order-summary-card-gst"
          label={t('mweb.checkout.gst', { vars: { pct: breakup.gstPct } })}
          value={fmt(breakup.gst)}
        />
        {roundOff > 0 && (
          <Row testId="product-order-summary-card-round-off" label={t('mweb.checkout.roundOff')} value={`+ ${fmt(roundOff)}`} />
        )}
        <Divider sx={{ my: 1 }} />
        <Row testId="product-order-summary-card-total" label={t('mweb.checkout.totalPayable')} value={fmt(payable ?? breakup.total)} bold />
        <CoinSummaryRows coins={coins} />
      </Stack>
    </Card>
  );
}
