import { XStack, YStack } from 'tamagui';
import { useTranslation } from '@/hooks/useTranslation';
import { StatTile } from '@/components/studio/StatTile';

/** Shape of the server's EarningsSummary (host + venue studios). */
export interface EarningsSummaryData {
  currency_symbol: string;
  lifetime_earnings: number;
  pending_amount: number;
  pods_completed: number;
  this_month_earnings: number;
}

/** Earnings summary tiles — Lifetime / Pending approval / This month / Pods
 * completed. Shared by the Host dashboard and Venue Earnings (mWeb twin). */
export function EarningsSummaryTiles({ summary }: Readonly<{ summary: EarningsSummaryData }>) {
  const { t } = useTranslation();
  const money = (value: number) => `${summary.currency_symbol}${value.toFixed(2)}`;
  return (
    <YStack gap={12} testID="earnings-summary-tiles">
      <XStack gap={12}>
        <StatTile
          label={t('mweb.common.lifetimeEarnings')}
          value={money(summary.lifetime_earnings)}
        />
        <StatTile label={t('mweb.common.pendingApproval')} value={money(summary.pending_amount)} />
      </XStack>
      <XStack gap={12}>
        <StatTile label={t('mweb.common.thisMonth')} value={money(summary.this_month_earnings)} />
        <StatTile label={t('mweb.common.podsCompleted')} value={String(summary.pods_completed)} />
      </XStack>
    </YStack>
  );
}
