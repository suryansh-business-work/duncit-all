import { Text, XStack, YStack } from 'tamagui';

/** Shape of the server's EarningsSummary (host + venue studios). */
export interface EarningsSummaryData {
  currency_symbol: string;
  lifetime_earnings: number;
  pending_amount: number;
  pods_completed: number;
  this_month_earnings: number;
}

function Tile({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <YStack
      flex={1}
      padding={12}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={17} fontWeight="900" color="$color" numberOfLines={1}>
        {value}
      </Text>
      <Text fontSize={12} fontWeight="700" color="$muted">
        {label}
      </Text>
    </YStack>
  );
}

/** Earnings summary tiles — Lifetime / Pending approval / This month / Pods
 * completed. Shared by the Host dashboard and Venue Earnings (mWeb twin). */
export function EarningsSummaryTiles({ summary }: Readonly<{ summary: EarningsSummaryData }>) {
  const money = (value: number) => `${summary.currency_symbol}${value.toFixed(2)}`;
  return (
    <YStack gap={10} testID="earnings-summary-tiles">
      <XStack gap={10}>
        <Tile label="Lifetime earnings" value={money(summary.lifetime_earnings)} />
        <Tile label="Pending approval" value={money(summary.pending_amount)} />
      </XStack>
      <XStack gap={10}>
        <Tile label="This month" value={money(summary.this_month_earnings)} />
        <Tile label="Pods completed" value={String(summary.pods_completed)} />
      </XStack>
    </YStack>
  );
}
