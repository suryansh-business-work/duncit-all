import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import type { PodPendingView } from '@/hooks/usePodPendingView';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { approvalBadge, venueMapUrl } from '@/utils/pod-pending';
import { ActionLink } from './ActionLink';
import { InfoRowList, type InfoRowProps } from './InfoRow';

type PendingVenue = NonNullable<PodPendingView['venue']>;

/** Venue details card — slot-decision badge, the venue's contact details, and
 * a "View on Map" deep link. */
export function VenuePendingCard({
  venue,
  status,
}: Readonly<{ venue: PendingVenue; status: string }>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const badge = approvalBadge(status, t);
  const badgeColor = { warning: colors.warning, success: colors.success, error: colors.danger }[
    badge.tone
  ];
  const mapUrl = venueMapUrl(venue);
  const rows: InfoRowProps[] = [];
  if (venue.contact_person) {
    rows.push({
      icon: 'person',
      label: t('mweb.podPending.contactPerson'),
      value: venue.contact_person,
      testID: 'venue-pending-contact',
    });
  }
  if (venue.phone) {
    rows.push({
      icon: 'phone',
      label: t('mweb.podPending.phone'),
      value: venue.phone,
      testID: 'venue-pending-phone',
    });
  }
  if (venue.email) {
    rows.push({
      icon: 'email',
      label: t('mweb.podPending.email'),
      value: venue.email,
      testID: 'venue-pending-email',
    });
  }
  if (venue.address) {
    rows.push({
      icon: 'place',
      label: t('mweb.podPending.address'),
      value: venue.address,
      testID: 'venue-pending-address',
    });
  }
  rows.push({
    icon: 'fact-check',
    label: t('mweb.podPending.approvalStatus'),
    value: badge.label,
    testID: 'venue-pending-approval',
  });

  return (
    <SurfaceCard testID="venue-pending-card" gap={8}>
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text flex={1} fontSize={16} fontWeight="600" color="$color" numberOfLines={2}>
          {venue.venue_name}
        </Text>
        <XStack
          alignItems="center"
          gap={4}
          height={28}
          paddingHorizontal={10}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
        >
          <MaterialIcons name={badge.icon} size={14} color={badgeColor} />
          <Text testID="venue-pending-badge" fontSize={12} fontWeight="600" color={badgeColor}>
            {badge.label}
          </Text>
        </XStack>
      </XStack>
      <InfoRowList rows={rows} />
      {mapUrl ? (
        <XStack>
          <ActionLink
            testID="venue-pending-map"
            icon="map"
            label={t('mweb.podPending.actionViewOnMap')}
            url={mapUrl}
          />
        </XStack>
      ) : null}
    </SurfaceCard>
  );
}
