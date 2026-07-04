import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { VenueChargesSheet } from '@/components/checkout/VenueChargesSheet';
import type { CheckoutPod } from '@/hooks/useCheckout';
import type { SelectedProduct } from '@/hooks/usePodProductSelection';
import type { CheckoutBreakup } from '@/utils/checkout-math';
import { formatMoney } from '@/utils/checkout-math';
import { formatDateTime } from '@/utils/date-format';

function Row({ label, value, bold }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text
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

interface ProductLine {
  product_id: string;
  product_name: string;
  quantity: number;
  total_cost: number;
}

/** Ticket price + a row per carried product + the add-ons subtotal. Shown only
 * when the buyer brought products from the pod shop — mirrors mWeb's
 * OrderSummaryCard (Ticket price = total − product total). */
function ProductBreakdown({
  items,
  ticketTotal,
  productTotal,
  fmt,
}: Readonly<{
  items: ProductLine[];
  ticketTotal: number;
  productTotal: number;
  fmt: (v: number) => string;
}>) {
  return (
    <>
      <Row label="Ticket price" value={fmt(ticketTotal)} />
      {items.map((item) => (
        <Row
          key={item.product_id}
          label={`${item.product_name} × ${item.quantity}`}
          value={fmt(item.total_cost)}
        />
      ))}
      <Row label="Products" value={fmt(productTotal)} />
    </>
  );
}

/** Resolve the picked products against the pod catalogue into display lines,
 * dropping any pick whose id is no longer in the catalogue. */
function toProductLines(pod: CheckoutPod, selectedProducts: SelectedProduct[]): ProductLine[] {
  const byId = new Map((pod?.product_requests ?? []).map((p) => [p.product_id, p]));
  return selectedProducts.flatMap((sel) => {
    const product = byId.get(sel.product_id);
    if (!product) return [];
    return [
      {
        product_id: product.product_id,
        product_name: product.product_name,
        quantity: sel.quantity,
        total_cost: Number(product.unit_cost ?? 0) * sel.quantity,
      },
    ];
  });
}

/** Order summary with the inclusive fee/GST breakup — RN twin of mWeb's
 * OrderSummaryCard. */
export function OrderSummary({
  pod,
  breakup,
  selectedProducts = [],
}: Readonly<{
  pod: CheckoutPod;
  breakup: CheckoutBreakup;
  selectedProducts?: SelectedProduct[];
}>) {
  const image = pod?.pod_images_and_videos?.find((m) => m.url)?.url;
  const fmt = (v: number) => formatMoney(breakup.currency, v);
  // Venue charges are paid at the venue — shown for transparency, never added to
  // the online "Total payable".
  const venueCharges = pod?.place_charges ?? [];
  const venueTotal = venueCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const [venueInfoOpen, setVenueInfoOpen] = useState(false);
  // Products carried from the pod shop: the ticket price is the remainder once
  // the add-on total is split back out of the (products-inclusive) grand total.
  const productItems = toProductLines(pod, selectedProducts);
  const productTotal = productItems.reduce((sum, item) => sum + item.total_cost, 0);
  const ticketTotal = Math.max(0, breakup.total - productTotal);

  return (
    <YStack
      testID="order-summary"
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      overflow="hidden"
    >
      {image ? (
        <AppImage
          source={{ uri: image }}
          style={{ width: '100%', height: 140 }}
          resizeMode="cover"
        />
      ) : null}
      <YStack padding={16} gap={8}>
        <Text fontSize={11} fontWeight="800" textTransform="uppercase" color="$muted">
          Ticket
        </Text>
        <Text fontSize={17} fontWeight="900" color="$color">
          {pod?.pod_title ?? 'Pod booking'}
        </Text>
        {pod?.pod_date_time ? (
          <Text fontSize={12.5} color="$muted">
            {formatDateTime(pod.pod_date_time)}
            {pod.zone_name ? ` · ${pod.zone_name}` : ''}
          </Text>
        ) : null}
        <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
        {productItems.length > 0 ? (
          <ProductBreakdown
            items={productItems}
            ticketTotal={ticketTotal}
            productTotal={productTotal}
            fmt={fmt}
          />
        ) : (
          <Row label="Subtotal" value={fmt(breakup.subtotal)} />
        )}
        <Row label={`Platform fee (${breakup.feePct}%)`} value={fmt(breakup.fee)} />
        <Row label={`GST (${breakup.gstPct}%)`} value={fmt(breakup.gst)} />
        <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
        <Row label="Total payable" value={fmt(breakup.total)} bold />
        {venueCharges.length > 0 ? (
          <YStack
            testID="venue-charges-row"
            marginTop={8}
            padding={12}
            borderRadius={12}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$background"
            gap={4}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap={6}>
                <Text fontSize={13} fontWeight="700" color="$color">
                  Venue Charges
                </Text>
                <XStack
                  testID="venue-charges-info"
                  role="button"
                  aria-label="About venue charges"
                  onPress={() => setVenueInfoOpen(true)}
                  pressStyle={{ opacity: 0.6 }}
                >
                  <MaterialIcons name="info-outline" size={16} color="#9aa0a6" />
                </XStack>
              </XStack>
              <Text fontSize={13} fontWeight="800" color="$color">
                {fmt(venueTotal)}
              </Text>
            </XStack>
            <Text fontSize={11.5} color="$muted">
              Payable directly at the venue
            </Text>
          </YStack>
        ) : null}
      </YStack>
      <VenueChargesSheet
        open={venueInfoOpen}
        charges={venueCharges}
        currency={breakup.currency}
        onClose={() => setVenueInfoOpen(false)}
      />
    </YStack>
  );
}
