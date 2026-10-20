import { Spinner, Text, YStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueUpcomingBookings } from '@/hooks/useVenueUpcomingBookings';

/**
 * The selected venue's next confirmed instant bookings on the Venue Studio
 * dashboard — the pod, its window and exactly what the venue is paid for it.
 * Read-only: hosts book instantly, there is nothing to approve.
 */
export function UpcomingBookingsCard({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { bookings, isLoading, error } = useVenueUpcomingBookings(venueId);

  return (
    <YStack gap={12} testID="venue-upcoming-bookings">
      <SectionHeader title={t('availability.upcomingBookings.title')} />
      <SurfaceCard gap={12}>
        {isLoading ? <Spinner color="$primary" /> : null}
        {error ? (
          <Text role="alert" testID="venue-upcoming-bookings-error" fontSize={13} color="$danger">
            {error}
          </Text>
        ) : null}
        {!isLoading && !error && bookings.length === 0 ? (
          <Text testID="venue-upcoming-bookings-empty" fontSize={14} color="$muted">
            {t('availability.upcomingBookings.empty')}
          </Text>
        ) : null}
        {bookings.map((booking) => (
          <YStack key={booking.slot_id} gap={2} testID={`venue-booking-${booking.slot_id}`}>
            <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
              {booking.pod_title}
            </Text>
            <Text fontSize={13} color="$muted">
              {[
                `${fmt.formatDateTime(booking.start_at)} – ${fmt.formatTime(booking.end_at)}`,
                booking.space_label,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text fontSize={12} color="$success">
              {t('availability.upcomingBookings.payout', {
                vars: { amount: formatMoney(booking.venue_payout, { decimals: 2 }) },
              })}
            </Text>
          </YStack>
        ))}
      </SurfaceCard>
    </YStack>
  );
}
