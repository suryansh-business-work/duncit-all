import { Spinner, Text, XStack, YStack } from 'tamagui';

import { usePotentialEarnings, type PotentialEarnings } from '@/hooks/usePotentialEarnings';
import type { CreatePodFinance } from './create-pod.types';

interface Props {
  finance: CreatePodFinance;
  slotPrice: number | null;
  venueId: string | null;
  podAmount: number;
  noOfSpots: number;
  isPhysical: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Server-computed per-booking earnings waterfall (potentialPodEarnings). */
function EarningsRows({
  waterfall,
  symbol,
  venuePicked,
}: Readonly<{ waterfall: PotentialEarnings; symbol: string; venuePicked: boolean }>) {
  const money = (value: number) => `${symbol}${value.toFixed(2)}`;
  const rows = [
    { label: 'Customer Pays', value: money(waterfall.amount) },
    { label: `− GST (${waterfall.gst_pct}%)`, value: money(waterfall.gst_amount) },
    {
      label: `− Platform Fee (${waterfall.platform_fee_pct}%)`,
      value: money(waterfall.platform_fee_amount),
    },
  ];
  if (venuePicked) {
    rows.push({ label: '− Venue slot price', value: money(waterfall.venue_amount) });
  }
  rows.push(
    { label: 'Your Amount', value: money(waterfall.host_amount) },
    {
      label: `− Your Commission (${waterfall.host_commission_pct}%)`,
      value: money(waterfall.host_commission_amount),
    },
  );
  return (
    <YStack gap={8} testID="create-pod-earnings">
      {rows.map((row) => (
        <Row key={row.label} label={row.label} value={row.value} />
      ))}
      <Row label="You Receive" value={money(waterfall.host_receives)} bold />
      <Text fontSize={11.5} color="$muted">
        ({waterfall.host_earn_pct}% of customer amount), per booking.
      </Text>
    </YStack>
  );
}

/** Slot cost + GST from the venue's booked slot, and the server-computed
 * potential-earnings waterfall for the entered ticket price. mWeb twin. */
export function PricePanel({
  finance,
  slotPrice,
  venueId,
  podAmount,
  noOfSpots,
  isPhysical,
}: Readonly<Props>) {
  const money = (value: number) => `${finance.currency_symbol}${round2(value)}`;
  const slotGst = slotPrice ? round2((slotPrice * finance.gst_pct) / 100) : 0;
  const slotTotal = (slotPrice ?? 0) + slotGst;
  const venuePicked = isPhysical && slotPrice !== null;
  const { waterfall, isLoading } = usePotentialEarnings(
    podAmount,
    venuePicked ? venueId : null,
    venuePicked ? slotPrice : null,
  );

  return (
    <YStack
      testID="create-pod-price-panel"
      gap={8}
      padding={14}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
    >
      <Text fontSize={14} fontWeight="900" color="$color">
        Slot cost & potential earnings
      </Text>
      {podAmount > 0 && noOfSpots > 0 ? (
        <Row
          label={`Total collection (${money(podAmount)} × ${noOfSpots})`}
          value={money(podAmount * noOfSpots)}
          bold
        />
      ) : null}
      {isPhysical ? (
        <>
          <Row
            label="Venue slot price"
            value={slotPrice === null ? 'Pick a slot first' : money(slotPrice)}
          />
          <Row
            label={`GST on slot (${finance.gst_pct}%)`}
            value={slotPrice === null ? '—' : money(slotGst)}
          />
          <Row label="Total venue cost" value={slotPrice === null ? '—' : money(slotTotal)} bold />
        </>
      ) : null}
      {isLoading ? (
        <Spinner testID="create-pod-earnings-loading" size="small" color="$primary" />
      ) : null}
      {waterfall ? (
        <EarningsRows
          waterfall={waterfall}
          symbol={finance.currency_symbol}
          venuePicked={venuePicked}
        />
      ) : null}
      <Text fontSize={11.5} color="$muted">
        Estimates at today's rates — final settlement happens after the pod completes.
      </Text>
    </YStack>
  );
}

function Row({
  label,
  value,
  bold = false,
}: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <XStack justifyContent="space-between" gap={12}>
      <Text
        fontSize={13}
        color={bold ? '$color' : '$muted'}
        fontWeight={bold ? '800' : '500'}
        flexShrink={1}
      >
        {label}
      </Text>
      <Text fontSize={13} fontWeight={bold ? '900' : '700'} color="$color">
        {value}
      </Text>
    </XStack>
  );
}
