import { Fragment } from 'react';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { RowDivider } from '@/components/club-admin/NavRow';
import { EarningsSummaryTiles } from '@/components/earnings/EarningsSummaryTiles';
import { useVenueEarnings, type VenuePayout } from '@/hooks/useVenueEarnings';
import { formatDate } from '@/utils/date-format';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** A payout's status, painted the way mWeb's filled MUI chip paints it. */
const STATUS_TONE: Record<string, string> = {
  PENDING: '$warning',
  APPROVED: '$success',
  REJECTED: '$danger',
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return formatDate(d) || '—';
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
    <Text testID="venue-payout-waterfall" fontSize={12} color="$muted">
      {fmt(b.share_amount)} slot price − {fmt(b.commission_amount)} commission ({b.commission_pct}%)
      = {fmt(b.payout_amount)} payout
    </Text>
  );
}

/** One payout, as a row of the history card. */
function PayoutRow({ payout, symbol }: Readonly<{ payout: VenuePayout; symbol: string }>) {
  const payable =
    payout.approved_amount ?? payout.breakdown?.payout_amount ?? payout.amount_requested;
  return (
    <YStack gap={6} paddingHorizontal={16} paddingVertical={14}>
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {payout.pod_title}
        </Text>
        <XStack
          paddingHorizontal={10}
          paddingVertical={4}
          borderRadius={999}
          backgroundColor={STATUS_TONE[payout.status] ?? '$muted'}
        >
          <Text fontSize={11} fontWeight="600" color="$onPrimary">
            {payout.status}
          </Text>
        </XStack>
      </XStack>
      <Text fontSize={12} color="$muted">
        {fmtDate(payout.created_at)}
      </Text>
      <WaterfallLine b={payout.breakdown} symbol={symbol} />
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={13} fontWeight="600" color="$muted">
          Payout
        </Text>
        <Text fontSize={16} fontWeight="700" color="$color">
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
  const { t } = useTranslation();
  const { summary, payouts, isLoading } = useVenueEarnings();
  const symbol = summary?.currency_symbol ?? '₹';
  // Nothing to frame while the first page is still on its way.
  const showHistory = payouts.length > 0 || !isLoading;

  return (
    <StackScreen header title={t('mweb.venueEarnings.earnings')} testID="venue-earnings-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={24} padding={16} paddingBottom={48}>
          {isLoading ? <Spinner testID="venue-earnings-loading" color="$primary" /> : null}
          {summary ? <EarningsSummaryTiles summary={summary} /> : null}
          <YStack gap={12}>
            <SectionHeader title="Payout history" />
            {showHistory ? (
              <SurfaceCard padding={0} overflow="hidden">
                {payouts.length === 0 ? (
                  <Text testID="venue-earnings-empty" padding={16} fontSize={14} color="$muted">
                    {t('mweb.venueEarnings.payoutsAppearHereAfterAPod')}
                  </Text>
                ) : null}
                {payouts.map((payout, index) => (
                  <Fragment key={payout.id}>
                    {index > 0 ? <RowDivider /> : null}
                    <PayoutRow payout={payout} symbol={symbol} />
                  </Fragment>
                ))}
              </SurfaceCard>
            ) : null}
          </YStack>
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
