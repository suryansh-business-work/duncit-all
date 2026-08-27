import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { ClubWithPods, HomeClub, HomePod } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Reveal } from '@/animations/Reveal';
import { PodCard } from '@/components/home/PodCard';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface ClubSectionProps extends ClubWithPods {
  onOpenPod: (pod: HomePod) => void;
  /** The category chip over each card's image (mock: "Sports"). */
  categoryLabelOf?: (pod: HomePod) => string | null;
  /** Save state + toggle; omit to hide the save buttons (signed-out). */
  savedOf?: (podDocId: string) => boolean;
  /** True while THAT pod's toggle is in flight — its icon becomes a spinner. */
  savingOf?: (podDocId: string) => boolean;
  onToggleSave?: (podDocId: string) => void;
  onOpenClub: (club: HomeClub) => void;
}

/** A club header (avatar + name + description) above a horizontal row of its
 * pods — RN port of mWeb's ClubSection. */
export function ClubSection({
  club,
  pods,
  onOpenPod,
  onOpenClub,
  categoryLabelOf,
  savedOf,
  savingOf,
  onToggleSave,
}: Readonly<ClubSectionProps>) {
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
        pressStyle={PRESS_STYLE.control}
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
            <AppImage
              source={{ uri: image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons name="groups" size={24} color={onPrimary} />
          )}
        </YStack>
        <YStack flex={1}>
          <Text fontSize={15.5} fontWeight="700" color="$color" numberOfLines={1}>
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
            <PodCard
              pod={pod}
              width={260}
              showPlace={false}
              onPress={() => onOpenPod(pod)}
              categoryLabel={categoryLabelOf?.(pod)}
              saved={savedOf?.(pod.id) ?? false}
              saving={savingOf?.(pod.id) ?? false}
              onToggleSave={onToggleSave ? () => onToggleSave(pod.id) : undefined}
            />
          </Reveal>
        ))}
      </ScrollView>
    </YStack>
  );
}
