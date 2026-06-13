import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { ClubWithPods, HomeClub, HomePod } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Reveal } from '@/animations/Reveal';
import { PodCard } from '@/components/home/PodCard';

interface ClubSectionProps extends ClubWithPods {
  onOpenPod: (pod: HomePod) => void;
  onOpenClub: (club: HomeClub) => void;
}

/** A club header (avatar + name + description) above a horizontal row of its
 * pods — RN port of mWeb's ClubSection. */
export function ClubSection({ club, pods, onOpenPod, onOpenClub }: Readonly<ClubSectionProps>) {
  const { onPrimary } = useThemeColors();
  const image = club.club_feature_images_and_videos.find((m) => !!m.url)?.url ?? null;

  return (
    <YStack gap={12}>
      <XStack
        testID={`club-section-${club.club_id}`}
        role="button"
        aria-label={club.club_name}
        onPress={() => onOpenClub(club)}
        alignItems="center"
        gap={12}
        paddingHorizontal={16}
        pressStyle={{ opacity: 0.8 }}
      >
        <YStack
          width={46}
          height={46}
          borderRadius={14}
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
            <MaterialIcons name="groups" size={24} color={onPrimary} />
          )}
        </YStack>
        <YStack flex={1}>
          <Text fontSize={15.5} fontWeight="900" color="$color" numberOfLines={1}>
            {club.club_name}
          </Text>
          {club.club_description ? (
            <Text fontSize={12} fontWeight="600" color="$muted" numberOfLines={1}>
              {club.club_description}
            </Text>
          ) : null}
        </YStack>
      </XStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
      >
        {pods.map((pod, index) => (
          <Reveal key={pod.id} index={index} scale>
            <PodCard pod={pod} width={260} showPlace={false} onPress={() => onOpenPod(pod)} />
          </Reveal>
        ))}
      </ScrollView>
    </YStack>
  );
}
