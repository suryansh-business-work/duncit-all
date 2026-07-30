import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { fireAndForget } from '@/utils/fire-and-forget';
import type { HostPayout } from '@/hooks/useHostPayouts';

interface HostShareSectionProps {
  payouts: HostPayout[];
  symbol: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

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

type Breakdown = NonNullable<HostPayout['breakdown']>;

/** v2: "your amount − commission"; v1: the legacy venue-bill lines. */
function BreakdownLines({
  b,
  symbol,
}: Readonly<{ b: Breakdown | null | undefined; symbol: string }>) {
  if (!b) return null;
  const fmt = (n: number) => `${symbol}${(Number(n) || 0).toFixed(2)}`;
  if (b.version >= 2) {
    return (
      <YStack gap={2}>
        <PayoutLine label="Your Amount" value={fmt(b.share_amount)} />
        <PayoutLine
          label={`− Commission (${b.commission_pct}%)`}
          value={fmt(b.commission_amount)}
        />
      </YStack>
    );
  }
  return (
    <YStack gap={2}>
      <PayoutLine label="Venue bill" value={fmt(b.venue_bill)} />
      <PayoutLine label={`GST (${b.gst_pct}%)`} value={fmt(b.gst_amount)} />
      <PayoutLine label={`Duncit Taken (${b.duncit_pct}%)`} value={fmt(b.duncit_amount)} />
    </YStack>
  );
}

function payableLabel(b: Breakdown | null | undefined) {
  if (!b) return 'Your Commission';
  if (b.version >= 2) return 'Payout';
  return `Your Commission (${b.payout_pct}%)`;
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
      <BreakdownLines b={b} symbol={symbol} />
      <XStack justifyContent="space-between">
        <Text fontSize={13} fontWeight="900" color="$color">
          {payableLabel(b)}
        </Text>
        <Text fontSize={13} fontWeight="900" color="$primary">
          {fmt(payable)}
        </Text>
      </XStack>
    </YStack>
  );
}

/** "Host Share" — every completion payout this host has earned, with status.
 *
 * The screen owns the payouts hook (so completing a pod can refetch this list),
 * and the section refetches itself whenever the screen regains focus — it used
 * to fetch once at mount and then never again, so a share earned after the
 * first visit simply never appeared. A load FAILURE renders its own message:
 * showing "Complete a pod to see your share here." for a network error told a
 * host with completed pods that they had none. */
export function HostShareSection({
  payouts,
  symbol,
  isLoading,
  error,
  refetch,
}: Readonly<HostShareSectionProps>) {
  const navigation = useNavigation();
  useEffect(
    () => navigation.addListener('focus', () => fireAndForget(refetch())),
    [navigation, refetch],
  );

  return (
    <YStack gap={12} testID="host-share-section">
      <Text fontSize={16} fontWeight="900" color="$color">
        Host Share
      </Text>
      {isLoading ? <Spinner testID="host-share-loading" color="$primary" /> : null}
      {!isLoading && error ? (
        <Text testID="host-share-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      {!isLoading && !error && payouts.length === 0 ? (
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
