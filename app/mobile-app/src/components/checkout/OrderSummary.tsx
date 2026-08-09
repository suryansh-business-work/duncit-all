import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { VenueChargesSheet } from '@/components/checkout/VenueChargesSheet';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CheckoutPod } from '@/hooks/useCheckout';
import type { CheckoutBreakup } from '@/utils/checkout-math';
import { formatMoney } from '@/utils/checkout-math';
import { formatDateTime } from '@/utils/date-format';

function Row({ label, value, bold }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text
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

/** Order summary with the inclusive fee/GST breakup — RN twin of mWeb's
 * OrderSummaryCard. Pod checkout is membership only: the subtotal is the whole
 * ticket, products are bought separately through the product checkout. */
export function OrderSummary({
  pod,
  breakup,
  seats = 1,
  unitAmount = 0,
}: Readonly<{
  pod: CheckoutPod;
  breakup: CheckoutBreakup;
  /** Seats picked on Pod Details — the total already multiplies by this. */
  seats?: number;
  /** Price of ONE seat, so the multiplied total below can be reconciled. */
  unitAmount?: number;
}>) {
  const { onPrimary, muted } = useThemeColors();
  const { t } = useTranslation();
  // The buyer chose this on Pod Details and the ticket price is × it, so the
  // number has to be visible here — a silent multiplier reads as a wrong price.
  const seatsText =
    seats === 1 ? t('mweb.checkout.seatsOne') : t('mweb.checkout.seatsMany', { count: seats });
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
        <Text fontSize={11} fontWeight="600" textTransform="uppercase" color="$muted">
          Ticket
        </Text>
        <Text fontSize={17} fontWeight="700" color="$color">
          {pod?.pod_title ?? 'Pod booking'}
        </Text>
        {pod?.pod_date_time ? (
          <Text fontSize={12.5} color="$muted">
            {formatDateTime(pod.pod_date_time)}
            {pod.zone_name ? ` · ${pod.zone_name}` : ''}
          </Text>
        ) : null}
        <XStack
          testID="order-summary-seats"
          alignItems="center"
          alignSelf="flex-start"
          gap={6}
          marginTop={2}
          paddingHorizontal={10}
          paddingVertical={4}
          borderRadius={999}
          backgroundColor="$primary"
        >
          <MaterialIcons name="groups" size={15} color={onPrimary} />
          <Text fontSize={12.5} fontWeight="700" color={onPrimary}>
            {seatsText}
          </Text>
        </XStack>
        <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
        {seats > 1 && unitAmount > 0 ? (
          <Row
            label={`Ticket ${fmt(unitAmount)} x ${seats} seats`}
            value={fmt(unitAmount * seats)}
          />
        ) : null}
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
                  <MaterialIcons name="info-outline" size={16} color={muted} />
                </XStack>
              </XStack>
              <Text fontSize={13} fontWeight="600" color="$color">
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
