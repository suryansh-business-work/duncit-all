import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { VenueChargesSheet } from '@/components/checkout/VenueChargesSheet';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CheckoutPod } from '@/hooks/useCheckout';
import type { CoinCheckoutSummary } from '@duncit/utils';
import { CoinSummaryRows } from '@/components/checkout/CoinSummaryRows';
import type { CheckoutBreakup } from '@/utils/checkout-math';
import { formatMoney } from '@/utils/checkout-math';
import { formatDateTime } from '@/utils/date-format';

/** One line of money taken off the bill — a coupon, redeemed coins. */
export interface CheckoutDiscount {
  key: string;
  label: string;
  amount: number;
}

function Row({
  label,
  value,
  bold,
  tone,
}: Readonly<{ label: string; value: string; bold?: boolean; tone?: string }>) {
  const labelColor = tone ?? (bold ? '$color' : '$muted');
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text fontSize={bold ? 15 : 13} fontWeight={bold ? '700' : '600'} color={labelColor}>
        {label}
      </Text>
      <Text fontSize={bold ? 16 : 13} fontWeight={bold ? '700' : '600'} color={tone ?? '$color'}>
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
  grossTotal,
  discounts = [],
  seats = 1,
  unitAmount = 0,
  coins = null,
}: Readonly<{
  pod: CheckoutPod;
  /**
   * The breakup of what is ACTUALLY charged. When coins or a coupon are
   * applied the gross shrinks and the tax inside it shrinks with it — the
   * server re-quotes on the discounted amount — so this has to be the
   * discounted breakup or the GST row would describe money nobody pays.
   */
  breakup: CheckoutBreakup;
  /** The bill before any discount, for the line above the deductions. */
  grossTotal?: number;
  /** Deductions to list between the subtotal and the tax. */
  discounts?: CheckoutDiscount[];
  /** Seats picked on Pod Details — the total already multiplies by this. */
  seats?: number;
  /** Price of ONE seat, so the multiplied total below can be reconciled. */
  unitAmount?: number;
  /** Coins spent, left and earned on this bill. Absent hides the coin block. */
  coins?: CoinCheckoutSummary | null;
}>) {
  const { onPrimary, muted } = useThemeColors();
  const { t } = useTranslation();
  // The buyer chose this on Pod Details and the ticket price is × it, so the
  // number has to be visible here — a silent multiplier reads as a wrong price.
  const seatsText =
    seats === 1 ? t('mweb.checkout.seatsOne') : t('mweb.checkout.seatsMany', { count: seats });
  const image = pod?.pod_images_and_videos?.find((m) => m.url)?.url;
  const fmt = (v: number) => formatMoney(breakup.currency, v);
  // The bill before deductions. With nothing applied it is the payable, so the
  // card renders exactly as it always did.
  const gross = Number(grossTotal ?? breakup.total);
  const showsGross = seats > 1 && unitAmount > 0;
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
          {t('mweb.checkout.ticket')}
        </Text>
        <Text fontSize={17} fontWeight="700" color="$color">
          {pod?.pod_title ?? t('mweb.checkout.podBooking')}
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
        {showsGross ? (
          <Row
            label={t('mweb.checkout.ticketMultiplier', {
              vars: { price: fmt(unitAmount), seats },
            })}
            value={fmt(unitAmount * seats)}
          />
        ) : null}
        {/* Deductions need a number to come off. The multiplier line above is
            that number when it is there; a single-seat bill has no such line,
            so the gross is stated once before the discounts. */}
        {discounts.length > 0 && !showsGross ? (
          <Row label={t('mweb.checkout.ticketPrice')} value={fmt(gross)} />
        ) : null}
        {discounts.map((discount) => (
          <Row
            key={discount.key}
            label={discount.label}
            value={`− ${fmt(discount.amount)}`}
            tone="$success"
          />
        ))}
        <Row label={t('mweb.checkout.subtotal')} value={fmt(breakup.subtotal)} />
        <Row
          label={t('mweb.checkout.gst', { vars: { pct: breakup.gstPct } })}
          value={fmt(breakup.gst)}
        />
        <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
        <Row label={t('mweb.checkout.totalPayable')} value={fmt(breakup.total)} bold />
        <CoinSummaryRows coins={coins} />
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
                  {t('mweb.checkout.venueCharges')}
                </Text>
                <XStack
                  testID="venue-charges-info"
                  role="button"
                  aria-label={t('mweb.checkout.venueChargesAbout')}
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
              {t('mweb.checkout.venuePayAtVenue')}
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
