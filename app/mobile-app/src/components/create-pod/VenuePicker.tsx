import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { FieldLabel } from '@/components/Field';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodVenue } from './create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  venues: CreatePodVenue[];
  selectedId: string;
  onSelect: (id: string) => void;
  error?: string;
  emptyHint?: string;
  required?: boolean;
}

/** Step 3 venue picker — approved partner venues in the pod's city as a
 * horizontal card rail. Mobile twin of mWeb's VenuePicker. */
export function VenuePicker({
  venues,
  selectedId,
  onSelect,
  error,
  emptyHint,
  required,
}: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  const { t } = useTranslation();
  const selectVenue = t('mweb.createPod.selectVenue');

  if (venues.length === 0) {
    return (
      <YStack gap={8}>
        <FieldLabel label={selectVenue} required={required} testID="create-pod-venue" />
        <Text testID="create-pod-venue-empty" fontSize={13} color="$muted">
          {emptyHint ?? t('mweb.createPod.noVenues')}
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap={8}>
      <FieldLabel label={selectVenue} required={required} testID="create-pod-venue" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={12} paddingRight={12}>
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
                width={236}
                padding={12}
                gap={8}
                borderRadius={24}
                borderWidth={2}
                borderColor={selected ? '$primary' : '$cardBorder'}
                backgroundColor="$surface"
                pressStyle={PRESS_STYLE.control}
              >
                <XStack alignItems="center" gap={6}>
                  <Text flex={1} fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
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
                      paddingHorizontal={10}
                      paddingVertical={4}
                      borderRadius={999}
                      backgroundColor="$soft"
                    >
                      <Text fontSize={12} fontWeight="600" color="$color">
                        {venue.venue_type}
                      </Text>
                    </XStack>
                  ) : null}
                  {capacity ? (
                    <XStack
                      paddingHorizontal={10}
                      paddingVertical={4}
                      borderRadius={999}
                      backgroundColor="$soft"
                    >
                      <Text fontSize={12} fontWeight="600" color="$color">
                        {t('mweb.createPod.upTo', { vars: { capacity } })}
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
