import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePodVenue } from './create-pod.types';

/** Venue partner card — address, a Call Venue / Get Directions action row and
 * the contact shared with the host for slot follow-up. mWeb twin. */
export function VenueContactCard({ venue }: Readonly<{ venue: CreatePodVenue }>) {
  const { primary } = useThemeColors();
  const address = [venue.address_line1, venue.locality, venue.city, venue.state, venue.postal_code]
    .filter(Boolean)
    .join(', ');
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [venue.venue_name, address].filter(Boolean).join(', '),
  )}`;

  return (
    <YStack
      testID="create-pod-venue-contact"
      gap={8}
      padding={12}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
    >
      <Text fontSize={15} fontWeight="900" color="$color">
        {venue.venue_name}
      </Text>
      {address ? (
        <Text fontSize={13} color="$muted">
          {address}
        </Text>
      ) : null}
      <XStack gap={18}>
        {venue.owner_phone ? (
          <XStack
            testID="venue-call"
            role="button"
            aria-label="Call venue"
            onPress={() => Linking.openURL(`tel:${venue.owner_phone}`)}
            alignItems="center"
            gap={4}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="phone" size={16} color={primary} />
            <Text fontSize={13} fontWeight="800" color="$primary">
              Call Venue
            </Text>
          </XStack>
        ) : null}
        <XStack
          testID="venue-directions"
          role="button"
          aria-label="Get directions"
          onPress={() => Linking.openURL(directions)}
          alignItems="center"
          gap={4}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="directions" size={16} color={primary} />
          <Text fontSize={13} fontWeight="800" color="$primary">
            Get Directions
          </Text>
        </XStack>
      </XStack>
      <YStack gap={2}>
        <Text fontSize={12} fontWeight="800" color="$muted">
          Venue contact for follow-up
        </Text>
        <Text fontSize={14} fontWeight="800" color="$color">
          {venue.owner_name || venue.venue_name}
        </Text>
        {venue.owner_email ? (
          <Text fontSize={13} color="$color">
            {venue.owner_email}
          </Text>
        ) : null}
      </YStack>
    </YStack>
  );
}
