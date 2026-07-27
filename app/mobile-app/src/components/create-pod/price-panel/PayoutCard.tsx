import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

/** Green earnings emphasis — matches mWeb's success.main highlight. */
export const EARN_GREEN = '#22c55e';
const PAYOUT_BG = 'rgba(34,197,94,0.10)';
const PAYOUT_BORDER = 'rgba(34,197,94,0.35)';

interface Props {
  amount: string;
  payingPax: number;
  earnPct: number;
  /** The Net Payout audit line: collection − deductions = the amount shown. */
  collection: string;
  totalDeductions: string;
}

/** The final payout — the strongest element on the card: big green take-home,
 * the paying-pax count and the share-of-collection chip, with the estimates
 * note inside so the payout and its caveat read as one unit. mWeb twin. */
export function PayoutCard({
  amount,
  payingPax,
  earnPct,
  collection,
  totalDeductions,
}: Readonly<Props>) {
  return (
    <YStack
      testID="price-panel-payout"
      borderRadius={12}
      padding={12}
      backgroundColor={PAYOUT_BG}
      borderWidth={1}
      borderColor={PAYOUT_BORDER}
      gap={10}
    >
      <XStack alignItems="flex-start" gap={10}>
        <MaterialIcons name="account-balance-wallet" size={22} color={EARN_GREEN} />
        <YStack flex={1} minWidth={0} gap={4}>
          <Text fontSize={15.5} fontWeight="900" color="$color">
            You will receive
          </Text>
          <XStack alignItems="center" gap={8} flexWrap="wrap">
            <Text fontSize={11.5} fontWeight="700" color="$muted">
              For {payingPax} paying pax
            </Text>
            <XStack
              borderWidth={1}
              borderColor={PAYOUT_BORDER}
              borderRadius={999}
              paddingHorizontal={8}
              paddingVertical={2}
            >
              <Text fontSize={11} fontWeight="800" color={EARN_GREEN}>
                {earnPct}% of collection
              </Text>
            </XStack>
          </XStack>
        </YStack>
        <Text fontSize={21} fontWeight="900" color={EARN_GREEN}>
          {amount}
        </Text>
      </XStack>
      <YStack testID="price-panel-net-payout" gap={2} paddingHorizontal={4}>
        <XStack justifyContent="space-between">
          <Text fontSize={11.5} color="$muted">
            Total Collection
          </Text>
          <Text fontSize={11.5} fontWeight="700" color="$color">
            {collection}
          </Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text fontSize={11.5} color="$muted">
            − Total Deductions
          </Text>
          <Text fontSize={11.5} fontWeight="700" color="$color">
            {totalDeductions}
          </Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text fontSize={11.5} fontWeight="800" color="$color">
            = You will receive
          </Text>
          <Text fontSize={11.5} fontWeight="900" color={EARN_GREEN}>
            {amount}
          </Text>
        </XStack>
      </YStack>
      <YStack
        borderWidth={1}
        borderColor={PAYOUT_BORDER}
        borderStyle="dashed"
        borderRadius={10}
        paddingHorizontal={10}
        paddingVertical={7}
      >
        <Text fontSize={11.5} color="$muted">
          Estimates at today&apos;s rates — final settlement happens after the pod completes.
        </Text>
      </YStack>
    </YStack>
  );
}
