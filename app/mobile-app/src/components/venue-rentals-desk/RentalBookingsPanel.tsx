import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { canMarkRental, formatMoney, rentalStatusKey } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState';
import { RentalUnitsLine } from '@/components/rentals/RentalUnitsLine';
import { SurfaceCard } from '@/components/SurfaceCard';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import {
  useVenueRentalBookings,
  type DeskBooking,
  type DeskStats,
} from '@/hooks/useVenueRentalDesk';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

import { MarkRentalSheet } from './MarkRentalSheet';

const STAT_TILES: readonly {
  key: Exclude<keyof DeskStats, 'currency_symbol' | '__typename'>;
  money: boolean;
  labelKey: string;
}[] = [
  { key: 'bookings', money: false, labelKey: 'venueRentals.stats.bookings' },
  { key: 'open', money: false, labelKey: 'venueRentals.stats.open' },
  { key: 'rent_total', money: true, labelKey: 'venueRentals.stats.rentTotal' },
  { key: 'deposits_held', money: true, labelKey: 'venueRentals.stats.depositsHeld' },
  { key: 'earned', money: true, labelKey: 'venueRentals.stats.earned' },
  { key: 'paid_out', money: true, labelKey: 'venueRentals.stats.paidOut' },
];

/** The venue's rental numbers, as tiles. RN twin of @duncit/venue-rentals' VenueRentalStatsTiles. */
export function RentalStatsTiles({ stats }: Readonly<{ stats: DeskStats }>) {
  const { t } = useTranslation();
  return (
    <XStack flexWrap="wrap" gap={10} testID="venue-rental-stats">
      {STAT_TILES.map((tile) => (
        <SurfaceCard
          key={tile.key}
          flexBasis="47%"
          flexGrow={1}
          gap={4}
          testID={`venue-rental-stat-${tile.key}`}
        >
          <Text fontSize={12} color="$muted">
            {t(tile.labelKey)}
          </Text>
          <Text fontSize={18} fontWeight="800" color="$color">
            {tile.money
              ? formatMoney(stats[tile.key], { symbol: stats.currency_symbol })
              : String(stats[tile.key])}
          </Text>
        </SurfaceCard>
      ))}
    </XStack>
  );
}

function BookingCard({
  row,
  onMark,
}: Readonly<{ row: DeskBooking; onMark: (row: DeskBooking) => void }>) {
  const { t } = useTranslation();
  return (
    <SurfaceCard gap={4} testID={`venue-rental-${row.id}`}>
      <XStack justifyContent="space-between" gap={8}>
        <Text flex={1} fontSize={14.5} fontWeight="700" color="$color" numberOfLines={1}>
          {row.name}
        </Text>
        <Text fontSize={12} fontWeight="600" color="$muted">
          {t(rentalStatusKey(row.status))}
        </Text>
      </XStack>
      <Text fontSize={12.5} color="$muted" numberOfLines={1}>
        {[row.pod_title, row.guest_name, formatDateTime(row.created_at)]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <RentalUnitsLine row={row} />
      {row.deposit_at_venue > 0 ? (
        <Text fontSize={12.5} color="$muted" testID={`venue-rental-${row.id}-deposit-back`}>
          {`${t('venueRentals.table.depositAtVenue')}: ${formatMoney(row.deposit_at_venue, { symbol: row.currency_symbol })}`}
        </Text>
      ) : null}
      {canMarkRental(row) ? (
        <XStack marginTop={6}>
          <DuncitButton
            testID={`venue-rental-${row.id}-mark`}
            label={t('venueRentals.mark.action')}
            accessibilityLabel={t('venueRentals.mark.title', { vars: { name: row.name } })}
            size="sm"
            onPress={() => onMark(row)}
          />
        </XStack>
      ) : null}
    </SurfaceCard>
  );
}

interface Props {
  venueId: string;
  /** The dashboard shows the numbers over the list; the Bookings tab the list alone. */
  withStats: boolean;
}

/** The venue's recent rental bookings, each markable back or damaged, with its numbers. */
export function RentalBookingsPanel({ venueId, withStats }: Readonly<Props>) {
  const { t } = useTranslation();
  const { bookings, stats, depositRefundable, failed, refetch, mark } =
    useVenueRentalBookings(venueId);
  const [marking, setMarking] = useState<DeskBooking | null>(null);

  if (failed && !bookings) {
    return (
      <LoadErrorNotice
        testID="venue-rentals-error"
        message={t('venueRentals.items.loadFailed')}
        retryLabel={t('venueRentals.guest.retry')}
        onRetry={() => {
          refetch().catch(() => undefined);
        }}
      />
    );
  }
  return (
    <YStack gap={12}>
      {withStats && stats ? <RentalStatsTiles stats={stats} /> : null}
      {bookings?.length === 0 ? (
        <EmptyState
          icon="handshake"
          title={t('venueRentals.table.empty')}
          testID="venue-rentals-empty"
        />
      ) : null}
      {(bookings ?? []).map((row) => (
        <BookingCard key={row.id} row={row} onMark={setMarking} />
      ))}
      <MarkRentalSheet
        booking={marking}
        depositRefundable={depositRefundable}
        onClose={() => setMarking(null)}
        onMark={mark}
      />
    </YStack>
  );
}
