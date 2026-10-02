import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { inclusiveGst } from '@/utils/checkout-math';

/** Customer payment details — GST + total only (mirrors mWeb's
 * PodPaymentDetailsSection). Internal fee/host/venue splits are never shown. */
export function PaymentDetails({
  amount,
  isFree,
  gstPct,
  currency,
}: Readonly<{ amount: number; isFree: boolean; gstPct: number; currency: string }>) {
  const { t } = useTranslation();
  if (isFree || amount <= 0) {
    return (
      <Text fontSize={13.5} color="$muted">
        {t('mweb.podDetails.freeToJoin')}
      </Text>
    );
  }
  const money = (v: number) => `${currency}${v.toFixed(2)}`;
  return (
    <YStack gap={6}>
      <XStack justifyContent="space-between">
        <Text fontSize={13.5} color="$muted">
          {t('mweb.checkout.gst', { vars: { pct: gstPct } })}
        </Text>
        <Text fontSize={13.5} color="$color">
          {money(inclusiveGst(amount, gstPct))}
        </Text>
      </XStack>
      <XStack justifyContent="space-between">
        {/*
          Per SEAT, and it has to say so. This prices one ticket, while the bar
          on the same screen prices however many the seat picker holds — calling
          this "Total payable" put two different totals in front of the buyer
          and only one of them was what they would be charged.
        */}
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('mweb.podDetails.pricePerSeat')}
        </Text>
        <Text fontSize={14} fontWeight="600" color="$color">
          {money(amount)}
        </Text>
      </XStack>
      <Text fontSize={11.5} color="$muted">
        {t('mweb.podDetails.inclusiveOfGst')}
      </Text>
    </YStack>
  );
}
