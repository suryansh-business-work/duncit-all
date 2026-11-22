import { Text, XStack, YStack } from 'tamagui';
import { rentalStatusKey } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { SummaryRow } from '@/components/checkout/SummaryRow';
import { RentalUnitsLine } from '@/components/rentals/RentalUnitsLine';
import type { RentalDetail } from '@/hooks/useRentalBookingDetail';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

import { DetailSection, PhoneLink } from './DetailSection';

const THUMB = 64;

/** The item itself: what, how many, when it was booked and closed, and the damage noted. */
function ItemSection({ booking }: Readonly<{ booking: RentalDetail['booking'] }>) {
  const { t } = useTranslation();
  return (
    <DetailSection title={t('venueRentals.detail.summary')} testID="rental-detail-item">
      <XStack gap={12} alignItems="center">
        {booking.image_url ? (
          <YStack width={THUMB} height={THUMB} borderRadius="$4" overflow="hidden">
            <AppImage
              source={{ uri: booking.image_url }}
              style={{ width: THUMB, height: THUMB }}
              accessibilityLabel={booking.name}
            />
          </YStack>
        ) : null}
        <YStack flex={1} gap={4} minWidth={0}>
          <Text fontSize={15} fontWeight="700" color="$color">
            {booking.name}
          </Text>
          <Text fontSize={12} fontWeight="600" color="$muted">
            {t(rentalStatusKey(booking.status))}
          </Text>
          <RentalUnitsLine row={booking} />
        </YStack>
      </XStack>
      <SummaryRow
        label={t('venueRentals.detail.bookedOn')}
        value={formatDateTime(booking.created_at)}
      />
      {booking.marked_at ? (
        <SummaryRow
          label={t('venueRentals.detail.closedOn')}
          value={formatDateTime(booking.marked_at)}
        />
      ) : null}
      {booking.damage_note ? (
        <Text fontSize={13} color="$color" testID="rental-detail-damage-note">
          {booking.damage_note}
        </Text>
      ) : null}
    </DetailSection>
  );
}

/** Item, the guest who rented it, the pod it was for and where it goes back. */
export function RentalDetailPeople({ detail }: Readonly<{ detail: RentalDetail }>) {
  const { t } = useTranslation();
  const { guest, pod, venue } = detail;
  const notProvided = t('venueRentals.detail.notProvided');
  return (
    <>
      <ItemSection booking={detail.booking} />
      <DetailSection title={t('venueRentals.detail.guest')} testID="rental-detail-guest">
        <SummaryRow label={t('venueRentals.detail.name')} value={guest.name || notProvided} />
        {guest.phone ? (
          <PhoneLink
            phone={guest.phone}
            label={t('venueRentals.detail.phone')}
            testID="rental-detail-guest-phone"
          />
        ) : (
          <SummaryRow label={t('venueRentals.detail.phone')} value={notProvided} />
        )}
      </DetailSection>
      {pod ? (
        <DetailSection title={t('venueRentals.detail.pod')} testID="rental-detail-pod">
          <Text fontSize={14} fontWeight="600" color="$color">
            {pod.title}
          </Text>
          {pod.starts_at ? (
            <SummaryRow
              label={t('venueRentals.detail.starts')}
              value={formatDateTime(pod.starts_at)}
            />
          ) : null}
          {pod.ends_at ? (
            <SummaryRow label={t('venueRentals.detail.ends')} value={formatDateTime(pod.ends_at)} />
          ) : null}
        </DetailSection>
      ) : null}
      <DetailSection title={t('venueRentals.detail.venue')} testID="rental-detail-venue">
        <Text fontSize={14} fontWeight="600" color="$color">
          {venue.name}
        </Text>
        {venue.contact_name ? (
          <SummaryRow label={t('venueRentals.detail.contact')} value={venue.contact_name} />
        ) : null}
        {venue.phone ? (
          <PhoneLink
            phone={venue.phone}
            label={t('venueRentals.detail.phone')}
            testID="rental-detail-venue-phone"
          />
        ) : null}
        {venue.address ? (
          <Text fontSize={13} color="$muted">
            {venue.address}
          </Text>
        ) : null}
      </DetailSection>
    </>
  );
}
