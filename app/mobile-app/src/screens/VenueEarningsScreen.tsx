import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { EarningsSummaryTiles } from '@/components/earnings/EarningsSummaryTiles';
import { useVenueEarnings, type VenuePayout } from '@/hooks/useVenueEarnings';

const STATUS_BG: Record<string, string> = {
  PENDING: '#d97706',
  APPROVED: '#16a34a',
  REJECTED: '#dc2626',
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

type Breakdown = NonNullable<VenuePayout['breakdown']>;

/** v2 waterfall line: the venue's booked slot price minus Duncit commission. */
function WaterfallLine({
  b,
  symbol,
}: Readonly<{ b: Breakdown | null | undefined; symbol: string }>) {
  if (!b || b.version < 2) return null;
  const fmt = (n: number) => `${symbol}${n.toFixed(2)}`;
  return (
    <Text testID="venue-payout-waterfall" fontSize={11.5} color="$muted">
      {fmt(b.share_amount)} slot price − {fmt(b.commission_amount)} commission ({b.commission_pct}%)
      = {fmt(b.payout_amount)} payout
    </Text>
  );
}

function PayoutCard({ payout, symbol }: Readonly<{ payout: VenuePayout; symbol: string }>) {
  const payable =
    payout.approved_amount ?? payout.breakdown?.payout_amount ?? payout.amount_requested;
  return (
    <YStack
      gap={6}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={14} fontWeight="800" color="$color" numberOfLines={1}>
          {payout.pod_title}
        </Text>
        <XStack
          paddingHorizontal={8}
          paddingVertical={2}
          borderRadius={999}
          backgroundColor={STATUS_BG[payout.status] ?? '#6b7280'}
        >
          <Text fontSize={10.5} fontWeight="900" color="#ffffff">
            {payout.status}
          </Text>
        </XStack>
      </XStack>
      <Text fontSize={11.5} color="$muted">
        {fmtDate(payout.created_at)}
      </Text>
      <WaterfallLine b={payout.breakdown} symbol={symbol} />
      <XStack justifyContent="space-between">
        <Text fontSize={13} fontWeight="900" color="$color">
          Payout
        </Text>
        <Text fontSize={13} fontWeight="900" color="$primary">
          {symbol}
          {payable.toFixed(2)}
        </Text>
      </XStack>
    </YStack>
  );
}

/** Venue Earnings — summary tiles + payout history for the venue studio.
 * mWeb twin of the Venue Earnings page. */
export function VenueEarningsScreen() {
  const { summary, payouts, isLoading } = useVenueEarnings();
  const symbol = summary?.currency_symbol ?? '₹';

  return (
    <StackScreen header title="Earnings" testID="venue-earnings-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16} paddingBottom={48}>
          {isLoading ? <Spinner testID="venue-earnings-loading" color="$primary" /> : null}
          {summary ? <EarningsSummaryTiles summary={summary} /> : null}
          <Text fontSize={16} fontWeight="900" color="$color">
            Payout history
          </Text>
          {!isLoading && payouts.length === 0 ? (
            <Text testID="venue-earnings-empty" fontSize={13} color="$muted">
              Payouts from pods hosted at your venues will show up here.
            </Text>
          ) : null}
          {payouts.map((payout) => (
            <PayoutCard key={payout.id} payout={payout} symbol={symbol} />
          ))}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
