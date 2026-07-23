import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { VenueChargesSheet } from '@/components/checkout/VenueChargesSheet';
import type { CheckoutPod } from '@/hooks/useCheckout';
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

/** Order summary with the inclusive fee/GST breakup — RN twin of mWeb's
 * OrderSummaryCard. Pod checkout is membership only: the subtotal is the whole
 * ticket, products are bought separately through the product checkout. */
export function OrderSummary({
  pod,
  breakup,
}: Readonly<{
  pod: CheckoutPod;
  breakup: CheckoutBreakup;
}>) {
  const image = pod?.pod_images_and_videos?.find((m) => m.url)?.url;
  const fmt = (v: number) => formatMoney(breakup.currency, v);
  // Venue charges are paid at the venue — shown for transparency, never added to
  // the online "Total payable".
  const venueCharges = pod?.place_charges ?? [];
  const venueTotal = venueCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const [venueInfoOpen, setVenueInfoOpen] = useState(false);

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
        <Row label="Subtotal" value={fmt(breakup.subtotal)} />
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
