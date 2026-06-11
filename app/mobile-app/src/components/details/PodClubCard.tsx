import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodDetail } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';

type PodClub = NonNullable<PodDetail['club']>;

/** Club summary on the Pod Detail page — logo/initial + name + description and a
 * "View club" action. Brings mobile to parity with mWeb's PodClubSection. */
export function PodClubCard({
  club,
  onOpenClub,
}: Readonly<{ club: PodClub; onOpenClub: () => void }>) {
  const { primary } = useThemeColors();
  const logo = club.club_feature_images_and_videos[0]?.url || '';
  const initial = (club.club_name[0] ?? 'C').toUpperCase();

  return (
    <YStack gap={12}>
      <XStack gap={12} alignItems="center">
        <YStack
          width={48}
          height={48}
          borderRadius={24}
          overflow="hidden"
          alignItems="center"
          justifyContent="center"
          backgroundColor="$surface"
        >
          {logo ? (
            <Image source={{ uri: logo }} style={{ width: 48, height: 48 }} resizeMode="cover" />
          ) : (
            <Text fontSize={18} fontWeight="900" color="$primary">
              {initial}
            </Text>
          )}
        </YStack>
        <YStack flex={1} gap={2}>
          <Text fontSize={15} fontWeight="900" color="$color" numberOfLines={1}>
            {club.club_name}
          </Text>
          {club.club_description ? (
            <Text fontSize={12.5} color="$muted" numberOfLines={2}>
              {club.club_description}
            </Text>
          ) : null}
        </YStack>
      </XStack>
      <XStack
        testID="pod-view-club"
        role="button"
        aria-label="View club"
        onPress={onOpenClub}
        alignItems="center"
        gap={8}
        alignSelf="flex-start"
        pressStyle={{ opacity: 0.8 }}
      >
        <MaterialIcons name="groups" size={18} color={primary} />
        <Text fontSize={14} fontWeight="800" color="$primary">
          View club
        </Text>
      </XStack>
    </YStack>
  );
}
