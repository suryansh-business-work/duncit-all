import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { LocationItem } from '@/stores/location.store';

interface Props {
  cities: LocationItem[];
  draftId: string;
  onPick: (loc: LocationItem) => void;
}

export function CityList({ cities, draftId, onPick }: Readonly<Props>) {
  const { primary } = useThemeColors();

  return (
    <YStack gap={8}>
      <Text fontSize={11} fontWeight="900" color="$muted" letterSpacing={0.6}>
        CITY
      </Text>
      {cities.length === 0 ? (
        <Text fontSize={13} color="$muted">
          No cities here yet.
        </Text>
      ) : null}
      {cities.map((loc) => {
        const active = draftId === loc.id;
        return (
          <XStack
            key={loc.id}
            testID={`location-${loc.id}`}
            role="button"
            aria-label={loc.location_name}
            aria-pressed={active}
            onPress={() => onPick(loc)}
            alignItems="center"
            gap={12}
            padding={10}
            borderRadius={14}
            borderWidth={active ? 1.5 : 1}
            borderColor={active ? '$primary' : '$borderColor'}
            backgroundColor="$surface"
            pressStyle={{ opacity: 0.85 }}
          >
            {loc.location_image ? (
              <Image
                source={{ uri: loc.location_image }}
                style={{ width: 44, height: 44, borderRadius: 10 }}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons name="location-city" size={28} color={primary} />
            )}
            <YStack flex={1}>
              <Text fontSize={14.5} fontWeight="800" color="$color" numberOfLines={1}>
                {loc.location_name}
              </Text>
              <Text fontSize={12} color="$muted" numberOfLines={1}>
                {[loc.city, loc.state].filter(Boolean).join(', ')}
              </Text>
            </YStack>
            {active ? <MaterialIcons name="check-circle" size={20} color={primary} /> : null}
          </XStack>
        );
      })}
    </YStack>
  );
}
