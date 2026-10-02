import { YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import type { ProductShippingQuote } from '@/hooks/useProductShippingQuote';
import { formatMoney } from '@/utils/checkout-math';

import { Row } from './SummaryRow';

type QuoteLine = NonNullable<ProductShippingQuote>['lines'][number];

/** A warehouse group's delivery charge: "Free" when every line in the group met
 * its free-delivery threshold, else the (live or manual-fallback) charge. */
function quoteLineValue(line: QuoteLine, currency: string, t: Translate): string {
  if (line.free) return t('mweb.checkout.deliveryFree');
  return formatMoney(currency, line.charge);
}

/** A warehouse group's row label: the courier name, marked "(estimated)" when
 * ShipRocket could not price it live (manual fallback). No pod title — checkout
 * hides pod detail (products and pods are separate entities). */
function quoteLineLabel(line: QuoteLine, t: Translate): string {
  const courier = line.courier_name || t('mweb.checkout.delivery');
  return line.quoted ? courier : t('mweb.checkout.deliveryEstimated', { vars: { courier } });
}

/** Delivery rows — a prompt until a valid pincode, a spinner label while
 * quoting, else ONE ROW PER warehouse group plus the delivery total. RN twin of
 * mWeb's DeliveryRows. */
export function DeliveryRows({
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
    return <Row label={deliveryLabel} value={t('mweb.checkout.deliveryEnterPincode')} />;
  }
  if (!quote) {
    const pending = shippingLoading
      ? t('mweb.checkout.deliveryCalculating')
      : formatMoney(currency, 0);
    return <Row label={deliveryLabel} value={pending} />;
  }
  return (
    <YStack gap={8}>
      {quote.lines.map((line) => (
        <Row
          key={`${line.pod_id ?? ''}:${line.warehouse_id}`}
          label={quoteLineLabel(line, t)}
          value={quoteLineValue(line, currency, t)}
        />
      ))}
      <Row label={t('mweb.checkout.deliveryTotal')} value={formatMoney(currency, quote.total)} />
    </YStack>
  );
}
