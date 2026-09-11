import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { LocationItem } from '@/stores/location.store';
import { clubCountLabel } from '@/utils/location-tree';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SectionLabel } from './SectionLabel';

/** Dark scrim over the city photo so its name reads in either theme. */
const PHOTO_SCRIM = ['rgba(9,9,15,0.08)', 'rgba(9,9,15,0.78)'] as const;

interface Props {
  cities: LocationItem[];
  draftId: string;
  onPick: (loc: LocationItem) => void;
}

/** A city tile: the city's photo under a scrim (or a surface tile with a
 * coral city glyph when it has none), the name and its club count; the chosen
 * one is ringed green with a check. mWeb twin: app-header/LocationCityCard. */
function CityTile({
  loc,
  active,
  onPress,
}: Readonly<{ loc: LocationItem; active: boolean; onPress: () => void }>) {
  const { primary, accent } = useThemeColors();
  const photo = loc.location_image;
  const ink = photo ? 'white' : '$color';

  return (
    <YStack
      testID={`location-${loc.id}`}
      role="button"
      aria-label={loc.location_name}
      aria-pressed={active}
      onPress={onPress}
      width={110}
      height={112}
      padding={10}
      justifyContent="flex-end"
      borderRadius={18}
      borderWidth={2}
      borderColor={active ? '$primary' : 'transparent'}
      backgroundColor="$surface"
      overflow="hidden"
      pressStyle={PRESS_STYLE.surface}
    >
      {photo ? (
        <>
          <AppImage source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={PHOTO_SCRIM} style={StyleSheet.absoluteFill} />
        </>
      ) : (
        <YStack position="absolute" top={10} left={10}>
          <MaterialIcons name="location-city" size={24} color={accent} />
        </YStack>
      )}
      {active ? (
        <YStack position="absolute" top={8} right={8} borderRadius={999} backgroundColor="$surface">
          <MaterialIcons name="check-circle" size={20} color={primary} />
        </YStack>
      ) : null}
      {/* Above the absolute photo: web paints positioned nodes last. */}
      <Text zIndex={1} fontSize={14} fontWeight="600" color={ink} numberOfLines={1}>
        {loc.location_name}
      </Text>
      <Text zIndex={1} fontSize={12} fontWeight="500" color={ink} opacity={0.9} numberOfLines={1}>
        {clubCountLabel(loc.active_club_count)}
      </Text>
    </YStack>
  );
}

export function CityList({ cities, draftId, onPick }: Readonly<Props>) {
  return (
    <YStack gap={8}>
      <SectionLabel>CITY</SectionLabel>
      {cities.length === 0 ? (
        <Text fontSize={13} color="$muted">
          No cities here yet.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap={8} paddingRight={8}>
            {cities.map((loc) => (
              <CityTile
                key={loc.id}
                loc={loc}
                active={draftId === loc.id}
                onPress={() => onPick(loc)}
              />
            ))}
          </XStack>
        </ScrollView>
      )}
    </YStack>
  );
}
