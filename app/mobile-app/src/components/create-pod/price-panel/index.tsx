import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { usePotentialEarnings } from '@/hooks/usePotentialEarnings';
import type { CreatePodFinance } from '../create-pod.types';
import { ChargesAccordion } from './ChargesAccordion';
import { EARN_GREEN, PayoutCard } from './PayoutCard';

const FREE_NOTE_BG = 'rgba(34,197,94,0.08)';
const FREE_NOTE_BORDER = 'rgba(34,197,94,0.30)';
const HOST_FREE_NOTE =
  'Your spot is free — that is why the total calculation is based on the remaining available slots.';

interface Props {
  finance: CreatePodFinance;
  slotPrice: number | null;
  venueId: string | null;
  podAmount: number;
  noOfSpots: number;
  isPhysical: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The host's final calculation for a pod — the server-computed earnings, billed
 * on PAYABLE spots (total − 1, the host's own seat is free) with the venue's
 * fixed slot price deducted once. Charges are grouped in a collapsible tree and
 * the payout card is the strongest element. mWeb twin. */
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
  // A 1-spot pod is the host's own free seat — there is nothing to bill.
  const hostOnly = ready && noOfSpots === 1;
  const { projection, waterfall, isLoading } = usePotentialEarnings(
    podAmount,
    noOfSpots,
    venuePicked ? venueId : null,
    venuePicked ? slotPrice : null,
  );
  const symbol = finance.currency_symbol;
  const money = (value: number) => `${symbol}${value.toFixed(2)}`;

  return (
    <YStack
      testID="create-pod-price-panel"
      gap={10}
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
      {noOfSpots > 0 ? (
        <XStack
          testID="price-panel-host-free-note"
          gap={8}
          alignItems="flex-start"
          backgroundColor={FREE_NOTE_BG}
          borderWidth={1}
          borderColor={FREE_NOTE_BORDER}
          borderRadius={12}
          paddingHorizontal={10}
          paddingVertical={8}
        >
          <MaterialIcons name="info-outline" size={16} color={EARN_GREEN} />
          <Text flex={1} fontSize={12} color="$color">
            {HOST_FREE_NOTE}
          </Text>
        </XStack>
      ) : null}
      {ready ? null : (
        <Text fontSize={12.5} color="$muted">
          Set a ticket price and the number of spots to preview your earnings.
        </Text>
      )}
      {hostOnly ? (
        <Text testID="price-panel-host-only" fontSize={12.5} color="$muted">
          This pod only has your own spot, which is free. Add more spots to earn.
        </Text>
      ) : null}
      {ready && isLoading ? (
        <Spinner testID="create-pod-earnings-loading" size="small" color="$primary" />
      ) : null}
      {/* Hide the previous waterfall while a new amount is loading, so stale
          money rows never render beside labels built from the live inputs. */}
      {ready && projection && waterfall && !isLoading ? (
        <YStack gap={10} testID="create-pod-earnings">
          <XStack justifyContent="space-between" gap={12}>
            <Text fontSize={13} fontWeight="800" color="$color" flexShrink={1}>
              Total collection ({symbol}
              {round2(podAmount).toLocaleString('en-IN')} × {projection.payable_spots})
            </Text>
            <Text fontSize={13} fontWeight="900" color={EARN_GREEN}>
              {money(waterfall.amount)}
            </Text>
          </XStack>
          <ChargesAccordion waterfall={waterfall} hasVenue={venuePicked} money={money} />
          <PayoutCard
            amount={money(waterfall.host_receives)}
            payingPax={projection.payable_spots}
            earnPct={waterfall.host_earn_pct}
          />
        </YStack>
      ) : null}
    </YStack>
  );
}
