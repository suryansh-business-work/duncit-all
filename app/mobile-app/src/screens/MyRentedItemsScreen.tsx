import { useCallback, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { rentalMoney, rentalRefundKey, rentalStatusKey } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { RentalUnitsLine } from '@/components/rentals/RentalUnitsLine';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { MyRentalBookingsDocument } from '@/graphql/rentals';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { formatDateTime } from '@/utils/date-format';

const PAGE_SIZE = 20;

type Row = Awaited<ReturnType<typeof fetchPage>>[number];

const fetchPage = async (limit: number) =>
  (await graphqlRequest(MyRentalBookingsDocument, { limit, offset: 0 }, { auth: true }))
    .myRentalBookings;

/** What comes back to the member once a rental closed, or what was kept. */
function outcomeKey(row: Row): { key: string; amount: number } | null {
  const refund = String(row.refund_status);
  if (refund === 'PAID' || refund === 'IN_PAYMENT')
    return { key: 'venueRentals.guest.refunded', amount: row.refund_due };
  if (refund === 'DUE') return { key: 'venueRentals.guest.refundDue', amount: row.refund_due };
  if (row.damage_claim > 0)
    return { key: 'venueRentals.guest.damageKept', amount: row.damage_claim };
  return null;
}

function RentalRow({ row }: Readonly<{ row: Row }>) {
  const { t } = useTranslation();
  const money = (amount: number) => rentalMoney(row.currency_symbol, amount);
  const outcome = outcomeKey(row);
  return (
    <SurfaceCard gap={4} testID={`rented-item-${row.id}`}>
      <XStack justifyContent="space-between" alignItems="center" gap={8}>
        <Text flex={1} fontSize={14.5} fontWeight="700" color="$color" numberOfLines={1}>
          {row.name}
        </Text>
        <Text fontSize={12} fontWeight="600" color="$muted">
          {t(rentalStatusKey(row.status))}
        </Text>
      </XStack>
      <Text fontSize={12.5} color="$muted" numberOfLines={1}>
        {t('venueRentals.guest.forPod', { vars: { pod: row.pod_title } })} ·{' '}
        {formatDateTime(row.created_at)}
      </Text>
      <RentalUnitsLine row={row} />
      {outcome ? (
        <Text fontSize={12.5} fontWeight="600" color="$color">
          {t(outcome.key, { vars: { amount: money(outcome.amount) } })} ·{' '}
          {t(rentalRefundKey(row.refund_status))}
        </Text>
      ) : null}
    </SurfaceCard>
  );
}

/**
 * My Rented Items (mWeb /rented-items) — every item the member rented with a
 * pod, newest first: what it cost, how it closed and what comes back.
 * RN twin of mWeb's rented-items-page.
 */
export function MyRentedItemsScreen() {
  const { t } = useTranslation();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setRows(await fetchPage(limit));
    setFailed(false);
  }, [limit]);
  const query = useReloadableQuery(load, { onError: () => setFailed(true) });

  return (
    <StackScreen title={t('venueRentals.guest.historyTitle')} testID="rented-items-screen">
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      >
        {failed && !rows ? (
          <YStack gap={8}>
            <Text fontSize={13.5} color="$muted">
              {t('venueRentals.guest.loadError')}
            </Text>
            <DuncitButton
              label={t('venueRentals.guest.retry')}
              variant="outline"
              onPress={() => query.refetch()}
            />
          </YStack>
        ) : null}
        {rows?.length === 0 ? (
          <EmptyState
            icon="handshake"
            title={t('venueRentals.guest.historyEmpty')}
            testID="rented-items-empty"
          />
        ) : null}
        {(rows ?? []).map((row) => (
          <RentalRow key={row.id} row={row} />
        ))}
        {rows && rows.length >= limit ? (
          <DuncitButton
            label={t('venueRentals.guest.loadMore')}
            variant="outline"
            testID="rented-items-more"
            onPress={() => setLimit((current) => current + PAGE_SIZE)}
          />
        ) : null}
      </RefreshScrollView>
    </StackScreen>
  );
}
