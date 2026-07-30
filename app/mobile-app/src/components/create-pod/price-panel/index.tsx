import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { buildEarningsStatement, formatStatementMoney } from '@duncit/utils';

import type { CreatePodFinance } from '../create-pod.types';
import { EARNINGS_ESTIMATE_NOTE } from './step4-copy';
import { ChargesAccordion } from './ChargesAccordion';
import { EARN_GREEN, PayoutCard } from './PayoutCard';
import type { PodPricingState } from './usePodPricing';

const FREE_NOTE_BG = 'rgba(34,197,94,0.08)';
const FREE_NOTE_BORDER = 'rgba(34,197,94,0.30)';
const HOST_FREE_NOTE =
  'Your spot is free — that is why the total calculation is based on the remaining available slots.';

interface Props {
  finance: CreatePodFinance;
  /** Step 4's shared money state — the stepper owns it so this panel and the
   * Create Pod button read the exact same projection and guards. */
  pricing: PodPricingState;
}

/** The host's final calculation for a pod — the server-computed earnings, billed
 * on PAYABLE spots (total − 1, the host's own seat is free) with the venue's
 * fixed slot price deducted once. Charges are grouped in a collapsible tree and
 * the payout card is the strongest element. mWeb twin. */
export function PricePanel({ finance, pricing }: Readonly<Props>) {
  const { projection, waterfall, isLoading, venuePicked, ready, hostOnly, podAmount, noOfSpots } =
    pricing;
  const symbol = finance.currency_symbol;
  // ONE currency format everywhere on the card: ₹X,XXX.XX (en-IN grouping).
  const money = (value: number) => formatStatementMoney(value, symbol);
  const statement = waterfall
    ? buildEarningsStatement(waterfall, { has_venue: venuePicked, symbol })
    : null;

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
      {ready && projection && waterfall && statement && !isLoading ? (
        <YStack gap={10} testID="create-pod-earnings">
          <YStack gap={2}>
            <XStack justifyContent="space-between" gap={12}>
              <Text fontSize={13} fontWeight="800" color="$color" flexShrink={1}>
                Total collection ({money(podAmount)} × {projection.payable_spots})
              </Text>
              <Text fontSize={13} fontWeight="900" color={EARN_GREEN}>
                {money(waterfall.amount)}
              </Text>
            </XStack>
            <Text testID="price-panel-included-gst" fontSize={10.5} color="$muted">
              {statement.collection.included_gst_note}
            </Text>
          </YStack>
          <ChargesAccordion
            statement={statement}
            money={money}
            venueShortfall={pricing.venueShortfall}
          />
          <PayoutCard
            amount={money(waterfall.host_receives)}
            payingPax={projection.payable_spots}
            earnPct={waterfall.host_earn_pct}
            collection={money(statement.net_payout.collection)}
            totalDeductions={money(statement.net_payout.total_deductions)}
          />
        </YStack>
      ) : null}
      <Text testID="price-panel-estimate-note" fontSize={11} color="$muted">
        {EARNINGS_ESTIMATE_NOTE}
      </Text>
    </YStack>
  );
}

export { isVenueShortfall, totalPodValue, usePodPricing } from './usePodPricing';
export type { PodPricingInput, PodPricingState } from './usePodPricing';
export { SuggestedPriceLink } from './SuggestedPriceLink';
export { SuggestedPricesModal } from './SuggestedPricesModal';
export { ZeroEarningsNotice } from './ZeroEarningsNotice';
