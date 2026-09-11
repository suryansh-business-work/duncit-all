import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodVenue } from './create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Call / Directions — outlined green pills, the mWeb twin's small outlined buttons. */
const ACTION_PILL = {
  height: 36,
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 14,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '$primary',
  pressStyle: PRESS_STYLE.control,
} as const;

/** Venue partner card — address, a Call Venue / Get Directions action row and
 * the contact shared with the host for slot follow-up. mWeb twin. */
export function VenueContactCard({ venue }: Readonly<{ venue: CreatePodVenue }>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  const callVenue = t('mweb.createPod.callVenue');
  const getDirections = t('mweb.createPod.getDirections');
  const address = [venue.address_line1, venue.locality, venue.city, venue.state, venue.postal_code]
    .filter(Boolean)
    .join(', ');
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [venue.venue_name, address].filter(Boolean).join(', '),
  )}`;

  return (
    <SurfaceCard testID="create-pod-venue-contact" gap={10}>
      <Text fontSize={16} fontWeight="600" color="$color">
        {venue.venue_name}
      </Text>
      {address ? (
        <Text fontSize={13} color="$muted">
          {address}
        </Text>
      ) : null}
      <XStack gap={8} flexWrap="wrap">
        {venue.owner_phone ? (
          <XStack
            testID="venue-call"
            role="button"
            aria-label={callVenue}
            onPress={() => Linking.openURL(`tel:${venue.owner_phone}`)}
            {...ACTION_PILL}
          >
            <MaterialIcons name="phone" size={16} color={primary} />
            <Text fontSize={13} fontWeight="600" color="$primary">
              {callVenue}
            </Text>
          </XStack>
        ) : null}
        <XStack
          testID="venue-directions"
          role="button"
          aria-label={getDirections}
          onPress={() => Linking.openURL(directions)}
          {...ACTION_PILL}
        >
          <MaterialIcons name="directions" size={16} color={primary} />
          <Text fontSize={13} fontWeight="600" color="$primary">
            {getDirections}
          </Text>
        </XStack>
      </XStack>
      <YStack gap={2}>
        <Text fontSize={12} fontWeight="600" color="$muted">
          {t('mweb.createPod.venueContact')}
        </Text>
        <Text fontSize={14} fontWeight="600" color="$color">
          {venue.owner_name || venue.venue_name}
        </Text>
        {venue.owner_email ? (
          <Text fontSize={13} color="$color">
            {venue.owner_email}
          </Text>
        ) : null}
      </YStack>
    </SurfaceCard>
  );
}
