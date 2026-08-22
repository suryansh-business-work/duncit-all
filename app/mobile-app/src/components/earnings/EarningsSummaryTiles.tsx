import { Text, XStack, YStack } from 'tamagui';
import { useTranslation } from '@/hooks/useTranslation';

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
      <Text fontSize={17} fontWeight="700" color="$color" numberOfLines={1}>
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
  const { t } = useTranslation();
  const money = (value: number) => `${summary.currency_symbol}${value.toFixed(2)}`;
  return (
    <YStack gap={10} testID="earnings-summary-tiles">
      <XStack gap={10}>
        <Tile label={t('mweb.common.lifetimeEarnings')} value={money(summary.lifetime_earnings)} />
        <Tile label={t('mweb.common.pendingApproval')} value={money(summary.pending_amount)} />
      </XStack>
      <XStack gap={10}>
        <Tile label={t('mweb.common.thisMonth')} value={money(summary.this_month_earnings)} />
        <Tile label={t('mweb.common.podsCompleted')} value={String(summary.pods_completed)} />
      </XStack>
    </YStack>
  );
}
