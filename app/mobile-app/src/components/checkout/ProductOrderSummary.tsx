import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { FreeDeliveryBadge } from '@/components/cart/FreeDeliveryBadge';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import { lineQualifiesFreeDelivery } from '@/services/cart';
import { cartLineKey, type CartLine } from '@/stores/cart.store';
import type { ProductShippingQuote } from '@/hooks/useProductShippingQuote';
import type { CheckoutBreakup } from '@/utils/checkout-math';
import { formatMoney } from '@/utils/checkout-math';
import type { CoinCheckoutSummary } from '@duncit/utils';
import { CoinSummaryRows } from '@/components/checkout/CoinSummaryRows';

type QuoteLine = NonNullable<ProductShippingQuote>['lines'][number];

interface Props {
  lines: CartLine[];
  breakup: CheckoutBreakup;
  /** Coins spent, left and earned on this bill. Absent hides the coin block. */
  coins?: CoinCheckoutSummary | null;
  subtotal: number;
  quote: ProductShippingQuote | null;
  shippingLoading: boolean;
  pincodeValid: boolean;
  /** Opens the product-detail sheet for a line. Products and pods are separate
   * entities — the checkout lists products only, each with an info button. */
  onInfo: (productId: string) => void;
}

function Row({ label, value, bold }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <XStack justifyContent="space-between" alignItems="center" gap={12}>
      <Text
        flex={1}
        fontSize={bold ? 15 : 13}
        fontWeight={bold ? '700' : '600'}
        color={bold ? '$color' : '$muted'}
      >
        {label}
      </Text>
      <Text fontSize={bold ? 16 : 13} fontWeight={bold ? '700' : '600'} color="$color">
        {value}
      </Text>
    </XStack>
  );
}

/** The line's product photo as a tappable thumbnail that opens the product
 * details; falls back to a shopping-bag placeholder when the line has no image. */
function LineThumb({
  line,
  onInfo,
}: Readonly<{ line: CartLine; onInfo: (productId: string) => void }>) {
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  return (
    <XStack
      testID={`summary-info-${line.pod_id}:${cartLineKey(line)}`}
      role="button"
      aria-label={t('mweb.checkout.viewProduct', { vars: { name: line.product_name } })}
      onPress={() => onInfo(line.product_id)}
      pressStyle={{ opacity: 0.6 }}
      width={40}
      height={40}
      borderRadius={8}
      overflow="hidden"
      backgroundColor="$surface"
      alignItems="center"
      justifyContent="center"
    >
      {line.image_url ? (
        <AppImage
          testID={`summary-thumb-${line.pod_id}:${cartLineKey(line)}`}
          source={{ uri: line.image_url }}
          style={{ width: 40, height: 40 }}
          resizeMode="cover"
        />
      ) : (
        <MaterialIcons name="shopping-bag" size={18} color={muted} />
      )}
    </XStack>
  );
}

/** One product line: a tappable product photo (opens the product details),
 * name × qty and its subtotal, plus the free-delivery badge when the line's
 * subtotal reaches the product's threshold. No pod title — separate entities. */
function ProductLineRow({
  line,
  value,
  onInfo,
}: Readonly<{ line: CartLine; value: string; onInfo: (productId: string) => void }>) {
  const variant = line.variant_label ? ` — ${line.variant_label}` : '';
  const label = `${line.product_name}${variant} × ${line.quantity}`;
  return (
    <YStack gap={2}>
      <XStack justifyContent="space-between" alignItems="center" gap={8}>
        <XStack flex={1} minWidth={0} alignItems="center" gap={8}>
          <LineThumb line={line} onInfo={onInfo} />
          <Text flex={1} fontSize={13} fontWeight="600" color="$muted" numberOfLines={1}>
            {label}
          </Text>
        </XStack>
        <Text fontSize={13} fontWeight="700" color="$color">
          {value}
        </Text>
      </XStack>
      {lineQualifiesFreeDelivery(line) ? (
        <FreeDeliveryBadge testID={`summary-free-delivery-${line.pod_id}:${cartLineKey(line)}`} />
      ) : null}
    </YStack>
  );
}

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
function DeliveryRows({
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

/** Product-only order summary for the combined product checkout: a flat product
 * line list (each with an info button), products subtotal, one live delivery row
 * per warehouse group (ShipRocket) with a delivery total, and the payable total.
 * No pod title / ticket line — pods and products are separate entities and never
 * share a payment. RN twin of mWeb's ProductOrderSummaryCard. */
export function ProductOrderSummary({
  lines,
  breakup,
  subtotal,
  quote,
  shippingLoading,
  pincodeValid,
  onInfo,
  coins = null,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const estimated = !!quote && !quote.all_quoted;

  return (
    <YStack
      testID="product-order-summary"
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={16}
      gap={8}
    >
      <XStack gap={8} alignItems="center">
        <MaterialIcons name="shopping-bag" size={20} color="#ff8b5f" />
        <YStack flex={1} minWidth={0}>
          <Text fontSize={11} fontWeight="600" textTransform="uppercase" color="$muted">
            {t('mweb.checkout.orderSummary')}
          </Text>
          <Text fontSize={16} fontWeight="700" color="$color" numberOfLines={1}>
            {t('mweb.checkout.yourOrder')}
          </Text>
        </YStack>
      </XStack>
      <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
      <YStack gap={6}>
        {lines.map((line) => (
          <ProductLineRow
            key={`${line.pod_id}:${cartLineKey(line)}`}
            line={line}
            value={fmt(line.unit_cost * line.quantity)}
            onInfo={onInfo}
          />
        ))}
      </YStack>
      <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
      <Row label={t('mweb.checkout.subtotal')} value={fmt(subtotal)} />
      <DeliveryRows
        quote={quote}
        shippingLoading={shippingLoading}
        pincodeValid={pincodeValid}
        currency={breakup.currency}
      />
      {estimated ? (
        <Text testID="product-shipping-estimated" fontSize={11.5} color="$muted">
          {t('mweb.checkout.deliveryEstimatedNote')}
        </Text>
      ) : null}
      <Row
        label={t('mweb.checkout.gst', { vars: { pct: breakup.gstPct } })}
        value={fmt(breakup.gst)}
      />
      <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
      <Row label={t('mweb.checkout.totalPayable')} value={fmt(breakup.total)} bold />
      <CoinSummaryRows coins={coins} />
    </YStack>
  );
}
