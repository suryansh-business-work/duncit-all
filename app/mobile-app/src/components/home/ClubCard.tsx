import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import type { HomeClub } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';

/** A full-width club row — avatar, name and description. Used by the Clubs tab. */
export function ClubCard({ club, onPress }: Readonly<{ club: HomeClub; onPress?: () => void }>) {
  const { onPrimary, muted } = useThemeColors();
  const image = club.club_feature_images_and_videos.find((m) => !!m.url)?.url ?? null;

  return (
    <PressScale
      testID={`club-card-${club.club_id}`}
      accessibilityLabel={club.club_name}
      onPress={onPress}
    >
      <XStack
        alignItems="center"
        gap={14}
        padding={12}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <YStack
          width={54}
          height={54}
          borderRadius={16}
          overflow="hidden"
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons name="groups" size={26} color={onPrimary} />
          )}
        </YStack>
        <YStack flex={1} gap={2}>
          <Text fontSize={15.5} fontWeight="900" color="$color" numberOfLines={1}>
            {club.club_name}
          </Text>
          {club.club_description ? (
            <Text fontSize={12.5} fontWeight="600" color="$muted" numberOfLines={2}>
              {club.club_description}
            </Text>
          ) : null}
        </YStack>
        <MaterialIcons name="chevron-right" size={22} color={muted} />
      </XStack>
    </PressScale>
  );
}
