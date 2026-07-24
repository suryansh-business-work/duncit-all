import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FreeDeliveryBadge } from '@/components/cart/FreeDeliveryBadge';
import { lineQualifiesFreeDelivery } from '@/services/cart';
import { cartLineKey, type CartLine } from '@/stores/cart.store';
import type { ProductShippingQuote } from '@/hooks/useProductShippingQuote';
import type { CheckoutBreakup } from '@/utils/checkout-math';
import { formatMoney } from '@/utils/checkout-math';

type QuoteLine = NonNullable<ProductShippingQuote>['lines'][number];

interface Props {
  lines: CartLine[];
  breakup: CheckoutBreakup;
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
        fontWeight={bold ? '900' : '600'}
        color={bold ? '$color' : '$muted'}
      >
        {label}
      </Text>
      <Text fontSize={bold ? 16 : 13} fontWeight={bold ? '900' : '700'} color="$color">
        {value}
      </Text>
    </XStack>
  );
}

/** One product line: an info button (opens the product details), name × qty and
 * its subtotal, plus the free-delivery badge when the line's subtotal reaches
 * the product's threshold. No pod title — products and pods are separate. */
function ProductLineRow({
  line,
  value,
  onInfo,
}: Readonly<{ line: CartLine; value: string; onInfo: (productId: string) => void }>) {
  const label = `${line.product_name}${line.variant_label ? ` — ${line.variant_label}` : ''} × ${line.quantity}`;
  return (
    <YStack gap={2}>
      <XStack justifyContent="space-between" alignItems="center" gap={8}>
        <XStack flex={1} minWidth={0} alignItems="center" gap={6}>
          <XStack
            testID={`summary-info-${line.pod_id}:${cartLineKey(line)}`}
            role="button"
            aria-label={`View ${line.product_name} details`}
            onPress={() => onInfo(line.product_id)}
            pressStyle={{ opacity: 0.6 }}
          >
            <MaterialIcons name="info-outline" size={16} color="#9aa0a6" />
          </XStack>
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
function quoteLineValue(line: QuoteLine, currency: string): string {
  if (line.free) return 'Free';
  return formatMoney(currency, line.charge);
}

/** A warehouse group's row label: the courier name, marked "(estimated)" when
 * ShipRocket could not price it live (manual fallback). No pod title — checkout
 * hides pod detail (products and pods are separate entities). */
function quoteLineLabel(line: QuoteLine): string {
  const courier = line.courier_name || 'Delivery';
  return line.quoted ? courier : `${courier} (estimated)`;
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
  if (!pincodeValid) return <Row label="Delivery" value="Enter pincode" />;
  if (!quote) {
    const pending = shippingLoading ? 'Calculating…' : formatMoney(currency, 0);
    return <Row label="Delivery" value={pending} />;
  }
  return (
    <YStack gap={8}>
      {quote.lines.map((line) => (
        <Row
          key={`${line.pod_id ?? ''}:${line.warehouse_id}`}
          label={quoteLineLabel(line)}
          value={quoteLineValue(line, currency)}
        />
      ))}
      <Row label="Delivery total" value={formatMoney(currency, quote.total)} />
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
}: Readonly<Props>) {
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
          <Text fontSize={11} fontWeight="800" textTransform="uppercase" color="$muted">
            Order summary
          </Text>
          <Text fontSize={16} fontWeight="900" color="$color" numberOfLines={1}>
            Your order
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
      <Row label="Subtotal" value={fmt(subtotal)} />
      <DeliveryRows
        quote={quote}
        shippingLoading={shippingLoading}
        pincodeValid={pincodeValid}
        currency={breakup.currency}
      />
      {estimated ? (
        <Text testID="product-shipping-estimated" fontSize={11.5} color="$muted">
          Estimated delivery — final charge confirmed at checkout.
        </Text>
      ) : null}
      <Row label={`GST (${breakup.gstPct}%)`} value={fmt(breakup.gst)} />
      <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
      <Row label="Total payable" value={fmt(breakup.total)} bold />
    </YStack>
  );
}
