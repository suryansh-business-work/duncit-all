import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { ClubCityGroup } from '@duncit/utils';

import { PressScale } from '@/animations/PressScale';
import { AppImage } from '@/components/AppImage';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { HomeClub } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  group: ClubCityGroup<HomeClub>;
  onPress: () => void;
}

/** A city on the Clubs tab: its cover, name and how many clubs operate there.
 * Pressing it lists that city's clubs by locality. mWeb twin: clubs-page/ClubCityCard. */
export function ClubCityCard({ group, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent, muted } = useThemeColors();

  return (
    <PressScale
      testID={`club-city-card-${group.locationId}`}
      accessibilityLabel={group.city}
      onPress={onPress}
    >
      <SurfaceCard padding={12}>
        <YStack
          height={120}
          borderRadius={18}
          overflow="hidden"
          backgroundColor="$soft"
          alignItems="center"
          justifyContent="center"
        >
          {group.image ? (
            <AppImage
              source={{ uri: group.image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons name="location-city" size={40} color={accent} />
          )}
        </YStack>
        <XStack gap={8} alignItems="center" paddingTop={12}>
          <Text flex={1} fontSize={16} fontWeight="600" color="$color" numberOfLines={1}>
            {group.city}
          </Text>
          <Text fontSize={12} fontWeight="500" color="$muted">
            {t('mweb.clubsPage.clubCount', { count: group.clubs.length })}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={muted} />
        </XStack>
      </SurfaceCard>
    </PressScale>
  );
}
