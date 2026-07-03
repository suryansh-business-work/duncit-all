import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePodVenue } from './create-pod.types';

interface Props {
  venues: CreatePodVenue[];
  selectedId: string;
  onSelect: (id: string) => void;
  error?: string;
  emptyHint?: string;
}

/** Step 3 venue picker — approved partner venues in the pod's city as a
 * horizontal card rail. Mobile twin of mWeb's VenuePicker. */
export function VenuePicker({ venues, selectedId, onSelect, error, emptyHint }: Readonly<Props>) {
  const { primary, muted } = useThemeColors();

  if (venues.length === 0) {
    return (
      <YStack gap={8}>
        <Text fontSize={14} fontWeight="500" color="$color">
          Select venue partner
        </Text>
        <Text testID="create-pod-venue-empty" fontSize={12.5} color="$muted">
          {emptyHint ??
            'No venue partners are available in this location yet — pick another location or go virtual.'}
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap={8}>
      <Text fontSize={14} fontWeight="500" color="$color">
        Select venue partner
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={10} paddingRight={10}>
          {venues.map((venue) => {
            const selected = venue.id === selectedId;
            const locality = [venue.locality, venue.city].filter(Boolean).join(', ');
            const capacity =
              typeof venue.capacity === 'number' && venue.capacity > 0 ? venue.capacity : null;
            return (
              <YStack
                key={venue.id}
                testID={`create-pod-venue-${venue.id}`}
                role="button"
                aria-label={venue.venue_name}
                aria-pressed={selected}
                onPress={() => onSelect(venue.id)}
                width={224}
                padding={12}
                gap={8}
                borderRadius={14}
                borderWidth={selected ? 2 : 1}
                borderColor={selected ? '$primary' : '$borderColor'}
                backgroundColor="$surface"
                pressStyle={{ opacity: 0.85 }}
              >
                <XStack alignItems="center" gap={6}>
                  <Text flex={1} fontSize={15} fontWeight="900" color="$color" numberOfLines={1}>
                    {venue.venue_name}
                  </Text>
                  {selected ? (
                    <MaterialIcons name="check-circle" size={18} color={primary} />
                  ) : null}
                </XStack>
                {locality ? (
                  <XStack alignItems="center" gap={4}>
                    <MaterialIcons name="place" size={13} color={muted} />
                    <Text fontSize={12} color="$muted" numberOfLines={1}>
                      {locality}
                    </Text>
                  </XStack>
                ) : null}
                <XStack gap={6} flexWrap="wrap">
                  {venue.venue_type ? (
                    <XStack
                      paddingHorizontal={8}
                      paddingVertical={3}
                      borderRadius={999}
                      borderWidth={1}
                      borderColor="$borderColor"
                    >
                      <Text fontSize={11} fontWeight="700" color="$muted">
                        {venue.venue_type}
                      </Text>
                    </XStack>
                  ) : null}
                  {capacity ? (
                    <XStack
                      paddingHorizontal={8}
                      paddingVertical={3}
                      borderRadius={999}
                      borderWidth={1}
                      borderColor="$borderColor"
                    >
                      <Text fontSize={11} fontWeight="700" color="$muted">
                        Up to {capacity}
                      </Text>
                    </XStack>
                  ) : null}
                </XStack>
              </YStack>
            );
          })}
        </XStack>
      </ScrollView>
      {error ? (
        <Text testID="create-pod-venue-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
