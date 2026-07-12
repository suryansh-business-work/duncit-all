import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { usePotentialEarnings, type PotentialEarnings } from '@/hooks/usePotentialEarnings';
import type { CreatePodFinance } from './create-pod.types';

/** Green earnings emphasis — matches mWeb's success.main highlight. */
const EARN_GREEN = '#22c55e';

interface Props {
  finance: CreatePodFinance;
  slotPrice: number | null;
  venueId: string | null;
  podAmount: number;
  noOfSpots: number;
  isPhysical: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Server-computed earnings waterfall (potentialPodEarnings): the host's final
 * per-booking payout, plus the total take-home across all spots. */
function EarningsRows({
  waterfall,
  symbol,
  venuePicked,
  noOfSpots,
}: Readonly<{ waterfall: PotentialEarnings; symbol: string; venuePicked: boolean; noOfSpots: number }>) {
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
    { label: 'Your Amount (remainder)', value: money(waterfall.host_amount) },
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
      <Row label="You Receive" value={money(waterfall.host_receives)} bold color={EARN_GREEN} />
      <Text fontSize={11.5} color="$muted">
        ({waterfall.host_earn_pct}% of customer amount), per booking.
      </Text>
      {noOfSpots > 0 ? (
        <>
          <YStack height={1} backgroundColor="$borderColor" marginVertical={2} />
          <Row
            label={`Total take-home (${noOfSpots} spots)`}
            value={money(waterfall.host_receives * noOfSpots)}
            bold
            color={EARN_GREEN}
          />
        </>
      ) : null}
    </YStack>
  );
}

/** The host's final calculation for a pod — the server-computed
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
      <XStack alignItems="center" gap={6}>
        <MaterialIcons name="insights" size={16} color={EARN_GREEN} />
        <Text fontSize={14} fontWeight="900" color="$color">
          Potential earnings
        </Text>
      </XStack>
      {podAmount > 0 && noOfSpots > 0 ? (
        <>
          <Row
            label={`Total collection (${money(podAmount)} × ${noOfSpots})`}
            value={money(podAmount * noOfSpots)}
            bold
            color={EARN_GREEN}
          />
          <YStack height={1} backgroundColor="$borderColor" marginVertical={2} />
        </>
      ) : null}
      <Text fontSize={11.5} fontWeight="800" color="$muted">
        Quick Breakdown (per booking)
      </Text>
      {isLoading ? (
        <Spinner testID="create-pod-earnings-loading" size="small" color="$primary" />
      ) : null}
      {waterfall ? (
        <EarningsRows
          waterfall={waterfall}
          symbol={finance.currency_symbol}
          venuePicked={venuePicked}
          noOfSpots={noOfSpots}
        />
      ) : null}
      <Text fontSize={11.5} color="$muted">
        Estimates at today&apos;s rates — final settlement happens after the pod completes.
      </Text>
    </YStack>
  );
}

function Row({
  label,
  value,
  bold = false,
  color = '$color',
}: Readonly<{ label: string; value: string; bold?: boolean; color?: string }>) {
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
      <Text fontSize={13} fontWeight={bold ? '900' : '700'} color={color}>
        {value}
      </Text>
    </XStack>
  );
}
