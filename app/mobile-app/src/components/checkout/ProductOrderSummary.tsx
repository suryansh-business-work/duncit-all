import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { cartLineKey, type CartLine } from '@/stores/cart.store';
import type { ProductShippingQuote } from '@/hooks/useProductShippingQuote';
import type { CheckoutBreakup } from '@/utils/checkout-math';
import { formatMoney } from '@/utils/checkout-math';

interface Props {
  podTitle: string;
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

/** The delivery row value: a prompt until a valid pincode, a spinner label while
 * quoting, else the live shipping total. Extracted to keep the summary free of a
 * nested ternary (S3358). RN twin of mWeb's deliveryValue. */
function deliveryValue(
  pincodeValid: boolean,
  shippingLoading: boolean,
  quote: ProductShippingQuote | null,
  currency: string,
): string {
  if (!pincodeValid) return 'Enter pincode';
  if (shippingLoading && !quote) return 'Calculating…';
  return formatMoney(currency, quote?.total ?? 0);
}

/** Product-only order summary for the standalone product checkout: line items,
 * products subtotal, live delivery (ShipRocket) and the payable total. No pod
 * ticket / "Event ticket" line — pods and products never share a payment. RN
 * twin of mWeb's ProductOrderSummaryCard. */
export function ProductOrderSummary({
  podTitle,
  lines,
  breakup,
  subtotal,
  quote,
  shippingLoading,
  pincodeValid,
}: Readonly<Props>) {
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const delivery = deliveryValue(pincodeValid, shippingLoading, quote, breakup.currency);
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
            {podTitle}
          </Text>
        </YStack>
      </XStack>
      <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
      {lines.map((line) => (
        <Row
          key={cartLineKey(line)}
          label={`${line.product_name}${line.variant_label ? ` — ${line.variant_label}` : ''} × ${line.quantity}`}
          value={fmt(line.unit_cost * line.quantity)}
        />
      ))}
      <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
      <Row label="Subtotal" value={fmt(subtotal)} />
      <Row label="Delivery" value={delivery} />
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
