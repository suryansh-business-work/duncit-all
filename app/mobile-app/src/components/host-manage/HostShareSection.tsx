import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useHostPayouts, type HostPayout } from '@/hooks/useHostPayouts';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';
const STATUS_BG: Record<Status, string> = {
  PENDING: '#d97706',
  APPROVED: '#16a34a',
  REJECTED: '#dc2626',
};

function StatusPill({ status }: Readonly<{ status: string }>) {
  return (
    <XStack
      paddingHorizontal={8}
      paddingVertical={2}
      borderRadius={999}
      backgroundColor={STATUS_BG[status as Status] ?? '#6b7280'}
    >
      <Text fontSize={10.5} fontWeight="900" color="#ffffff">
        {status}
      </Text>
    </XStack>
  );
}

function PayoutLine({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack justifyContent="space-between">
      <Text fontSize={11.5} color="$muted">
        {label}
      </Text>
      <Text fontSize={11.5} color="$color">
        {value}
      </Text>
    </XStack>
  );
}

function PayoutCard({ payout, symbol }: Readonly<{ payout: HostPayout; symbol: string }>) {
  const b = payout.breakdown;
  const fmt = (n: number) => `${symbol}${(Number(n) || 0).toFixed(2)}`;
  const payable = payout.approved_amount ?? b?.payout_amount ?? payout.amount_requested;
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
        <StatusPill status={payout.status} />
      </XStack>
      {b ? (
        <YStack gap={2}>
          <PayoutLine label="Venue bill" value={fmt(b.venue_bill)} />
          <PayoutLine label={`GST (${b.gst_pct}%)`} value={fmt(b.gst_amount)} />
          <PayoutLine label={`Duncit Taken (${b.duncit_pct}%)`} value={fmt(b.duncit_amount)} />
        </YStack>
      ) : null}
      <XStack justifyContent="space-between">
        <Text fontSize={13} fontWeight="900" color="$color">
          Your Commission{b ? ` (${b.payout_pct}%)` : ''}
        </Text>
        <Text fontSize={13} fontWeight="900" color="$primary">
          {fmt(payable)}
        </Text>
      </XStack>
    </YStack>
  );
}

/** "Host Share" — every completion payout this host has earned, with status. */
export function HostShareSection() {
  const { payouts, symbol, isLoading } = useHostPayouts();

  return (
    <YStack gap={12} testID="host-share-section">
      <Text fontSize={16} fontWeight="900" color="$color">
        Host Share
      </Text>
      {isLoading ? <Spinner testID="host-share-loading" color="$primary" /> : null}
      {!isLoading && payouts.length === 0 ? (
        <Text testID="host-share-empty" fontSize={13} color="$muted">
          Complete a pod to see your share here.
        </Text>
      ) : null}
      {payouts.map((payout) => (
        <PayoutCard key={payout.id} payout={payout} symbol={symbol} />
      ))}
    </YStack>
  );
}
