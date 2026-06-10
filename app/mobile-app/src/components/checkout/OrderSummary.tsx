import { Image } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

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
 * OrderSummaryCard. */
export function OrderSummary({
  pod,
  breakup,
}: Readonly<{ pod: CheckoutPod; breakup: CheckoutBreakup }>) {
  const image = pod?.pod_images_and_videos?.find((m) => m.url)?.url;
  const fmt = (v: number) => formatMoney(breakup.currency, v);

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
        <Image source={{ uri: image }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
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
        <Row label={`Platform fee (${breakup.feePct}%)`} value={fmt(breakup.fee)} />
        <Row label={`GST (${breakup.gstPct}%)`} value={fmt(breakup.gst)} />
        <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
        <Row label="Total payable" value={fmt(breakup.total)} bold />
      </YStack>
    </YStack>
  );
}
