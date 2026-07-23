import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FreeDeliveryBadge } from '@/components/cart/FreeDeliveryBadge';
import { lineQualifiesFreeDelivery } from '@/services/cart';
import { cartLineKey, groupLinesByPod, type CartLine } from '@/stores/cart.store';
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

/** One product line: name × qty and its subtotal, plus the free-delivery badge
 * when the line's subtotal reaches the product's threshold. */
function ProductLineRow({ line, value }: Readonly<{ line: CartLine; value: string }>) {
  const label = `${line.product_name}${line.variant_label ? ` — ${line.variant_label}` : ''} × ${line.quantity}`;
  return (
    <YStack gap={2}>
      <Row label={label} value={value} />
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

/** A (pod, warehouse) group's row label: the courier name, marked "(estimated)"
 * when ShipRocket could not price it live (manual fallback), prefixed with the
 * pod's title when the cart spans more than one pod. */
function quoteLineLabel(line: QuoteLine, podTitle: string | undefined): string {
  const courier = line.courier_name || 'Delivery';
  const base = line.quoted ? courier : `${courier} (estimated)`;
  if (podTitle) return `${podTitle} — ${base}`;
  return base;
}

/** Delivery rows — a prompt until a valid pincode, a spinner label while
 * quoting, else ONE ROW PER (pod, warehouse) group plus the delivery total. RN
 * twin of mWeb's DeliveryRows. */
function DeliveryRows({
  quote,
  shippingLoading,
  pincodeValid,
  currency,
  podTitles,
  multiPod,
}: Readonly<{
  quote: ProductShippingQuote | null;
  shippingLoading: boolean;
  pincodeValid: boolean;
  currency: string;
  podTitles: ReadonlyMap<string, string>;
  multiPod: boolean;
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
          label={quoteLineLabel(line, multiPod ? podTitles.get(line.pod_id ?? '') : undefined)}
          value={quoteLineValue(line, currency)}
        />
      ))}
      <Row label="Delivery total" value={formatMoney(currency, quote.total)} />
    </YStack>
  );
}

/** Product-only order summary for the combined product checkout: EVERY cart
 * line grouped by pod, products subtotal, one live delivery row per
 * (pod, warehouse) group (ShipRocket) with a delivery total, and the payable
 * total. No pod ticket line — pods and products never share a payment. RN twin
 * of mWeb's ProductOrderSummaryCard. */
export function ProductOrderSummary({
  lines,
  breakup,
  subtotal,
  quote,
  shippingLoading,
  pincodeValid,
}: Readonly<Props>) {
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const groups = groupLinesByPod(lines);
  const podTitles = new Map(groups.map(([podId, group]) => [podId, group.title]));
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
      {groups.map(([podId, group]) => (
        <YStack key={podId} gap={6}>
          <Text
            testID={`summary-pod-${podId}`}
            fontSize={11}
            fontWeight="800"
            textTransform="uppercase"
            color="$muted"
            numberOfLines={1}
          >
            {group.title}
          </Text>
          {group.lines.map((line) => (
            <ProductLineRow
              key={`${line.pod_id}:${cartLineKey(line)}`}
              line={line}
              value={fmt(line.unit_cost * line.quantity)}
            />
          ))}
        </YStack>
      ))}
      <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
      <Row label="Subtotal" value={fmt(subtotal)} />
      <DeliveryRows
        quote={quote}
        shippingLoading={shippingLoading}
        pincodeValid={pincodeValid}
        currency={breakup.currency}
        podTitles={podTitles}
        multiPod={groups.length > 1}
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
