import { formatMoney } from '../../checkout-page/checkoutMath';
import { useTranslation } from '../../../i18n/useTranslation';
import type { Translate } from '../../../i18n/fallback';
import type { ProductShippingQuote, ProductShippingQuoteLine } from '../../checkout-page/queries';
import Row from './Row';

/** A warehouse group's delivery charge: "Free" when every line in the group met
 * its free-delivery threshold, else the (live or manual-fallback) charge. */
function quoteLineValue(line: ProductShippingQuoteLine, currency: string, t: Translate): string {
  if (line.free) return t('mweb.checkout.deliveryFree');
  return formatMoney(currency, line.charge);
}

/** A warehouse group's row label: the courier name (the server emits '' for free
 * and manual-fallback groups — fall back to "Delivery"), marked "(estimated)"
 * when ShipRocket could not price it live. No pod title — checkout hides pod
 * detail (products and pods are separate entities). */
function quoteLineLabel(line: ProductShippingQuoteLine, t: Translate): string {
  const courier = line.courier_name || t('mweb.checkout.delivery');
  return line.quoted ? courier : t('mweb.checkout.deliveryEstimated', { vars: { courier } });
}

/** Delivery rows — a prompt until a valid pincode, a spinner label while
 * quoting, else ONE ROW PER warehouse group plus the delivery total. */
export default function DeliveryRows({
  quote,
  shippingLoading,
  pincodeValid,
  currency,
}: Readonly<{
  quote: ProductShippingQuote | null;
  shippingLoading: boolean;
  pincodeValid: boolean;
  currency: string;
}>) {
  const { t } = useTranslation();
  const deliveryLabel = t('mweb.checkout.delivery');
  if (!pincodeValid) {
    return (
      <Row
        testId="product-order-summary-card-delivery"
        label={deliveryLabel}
        value={t('mweb.checkout.deliveryEnterPincode')}
      />
    );
  }
  if (!quote) {
    const pending = shippingLoading ? t('mweb.checkout.deliveryCalculating') : formatMoney(currency, 0);
    return <Row testId="product-order-summary-card-delivery" label={deliveryLabel} value={pending} />;
  }
  return (
    <>
      {quote.lines.map((line) => {
        const lineKey = `${line.pod_id ?? ''}:${line.warehouse_id}`;
        return (
          <Row
            key={lineKey}
            testId={`product-order-summary-card-delivery-${lineKey}`}
            label={quoteLineLabel(line, t)}
            value={quoteLineValue(line, currency, t)}
          />
        );
      })}
      <Row
        testId="product-order-summary-card-delivery-total"
        label={t('mweb.checkout.deliveryTotal')}
        value={formatMoney(currency, quote.total)}
      />
    </>
  );
}
