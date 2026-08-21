import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { Text, XStack, YStack } from 'tamagui';

import type { PodPendingView } from '@/hooks/usePodPendingView';
import { useTranslation } from '@/hooks/useTranslation';
import { approvalBadge, venueMapUrl, type ApprovalTone } from '@/utils/pod-pending';
import { ActionLink } from './ActionLink';
import { InfoRow, type InfoRowProps } from './InfoRow';

const TONE_COLORS: Record<ApprovalTone, string> = {
  warning: semantic.warning,
  success: semantic.success,
  error: semantic.error,
};

type PendingVenue = NonNullable<PodPendingView['venue']>;

/** Venue details card — slot-decision badge, the venue's contact details, and
 * a "View on Map" deep link. */
export function VenuePendingCard({
  venue,
  status,
}: Readonly<{ venue: PendingVenue; status: string }>) {
  const { t } = useTranslation();
  const badge = approvalBadge(status, t);
  const badgeColor = TONE_COLORS[badge.tone];
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
    <YStack
      testID="venue-pending-card"
      gap={10}
      padding={12}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      backgroundColor="$surface"
    >
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text flex={1} fontSize={16} fontWeight="700" color="$color" numberOfLines={2}>
          {venue.venue_name}
        </Text>
        <XStack
          alignItems="center"
          gap={4}
          paddingHorizontal={8}
          paddingVertical={4}
          borderRadius={999}
          borderWidth={1}
          borderColor={badgeColor}
        >
          <MaterialIcons name={badge.icon} size={14} color={badgeColor} />
          <Text testID="venue-pending-badge" fontSize={11} fontWeight="700" color={badgeColor}>
            {badge.label}
          </Text>
        </XStack>
      </XStack>
      {rows.map((row) => (
        <InfoRow key={row.label} {...row} />
      ))}
      {mapUrl ? (
        <ActionLink
          testID="venue-pending-map"
          icon="map"
          label={t('mweb.podPending.actionViewOnMap')}
          url={mapUrl}
        />
      ) : null}
    </YStack>
  );
}
