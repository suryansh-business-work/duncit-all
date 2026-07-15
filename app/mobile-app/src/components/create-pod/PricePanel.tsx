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

/** Server-computed earnings waterfall (potentialPodEarnings) for the FULL pod
 * collection — the venue's fixed slot price is deducted once, not per booking. */
function EarningsRows({
  waterfall,
  symbol,
  venuePicked,
  podAmount,
  noOfSpots,
}: Readonly<{
  waterfall: PotentialEarnings;
  symbol: string;
  venuePicked: boolean;
  podAmount: number;
  noOfSpots: number;
}>) {
  const money = (value: number) => `${symbol}${value.toFixed(2)}`;
  const rows: { label: string; value: string; bold?: boolean; color?: string }[] = [
    {
      label: `Total collection (${symbol}${round2(podAmount).toLocaleString('en-IN')} × ${noOfSpots})`,
      value: money(waterfall.amount),
      bold: true,
      color: EARN_GREEN,
    },
    { label: `− GST (${waterfall.gst_pct}%)`, value: money(waterfall.gst_amount) },
    {
      label: `− Platform Fee (${waterfall.platform_fee_pct}%)`,
      value: money(waterfall.platform_fee_amount),
    },
  ];
  if (waterfall.club_admin_amount > 0) {
    rows.push({
      label: `− Club Admin (${waterfall.club_admin_pct}%)`,
      value: money(waterfall.club_admin_amount),
    });
  }
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
        <Row
          key={row.label}
          label={row.label}
          value={row.value}
          bold={row.bold}
          color={row.color}
        />
      ))}
      <Row label="You Receive" value={money(waterfall.host_receives)} bold color={EARN_GREEN} />
      <Text fontSize={11.5} color="$muted">
        For {noOfSpots} pax · {waterfall.host_earn_pct}% of collection
      </Text>
    </YStack>
  );
}

/** The host's final calculation for a pod — the server-computed earnings for the
 * full collection (ticket × pax), with the venue's fixed slot price once. mWeb twin. */
export function PricePanel({
  finance,
  slotPrice,
  venueId,
  podAmount,
  noOfSpots,
  isPhysical,
}: Readonly<Props>) {
  const venuePicked = isPhysical && slotPrice !== null;
  const ready = podAmount > 0 && noOfSpots > 0;
  const collection = ready ? round2(podAmount * noOfSpots) : 0;
  const { waterfall, isLoading } = usePotentialEarnings(
    collection,
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
      <Text fontSize={11.5} fontWeight="800" color="$muted">
        Your take-home for the full pod
      </Text>
      {ready ? null : (
        <Text fontSize={12.5} color="$muted">
          Set a ticket price and the number of spots to preview your earnings.
        </Text>
      )}
      {ready && isLoading ? (
        <Spinner testID="create-pod-earnings-loading" size="small" color="$primary" />
      ) : null}
      {/* Hide the previous waterfall while a new amount is loading, so stale
          money rows never render beside labels built from the live inputs. */}
      {ready && waterfall && !isLoading ? (
        <EarningsRows
          waterfall={waterfall}
          symbol={finance.currency_symbol}
          venuePicked={venuePicked}
          podAmount={podAmount}
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
