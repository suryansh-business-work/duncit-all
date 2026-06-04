import { Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { ExploreClub, ExplorePod, LikeState } from '@/stores/explore.store';
import { podPriceLabel } from '@/utils/pod-format';
import { ExploreActionButton } from '@/components/explore/ExploreActionButton';
import { ExploreMediaCarousel } from '@/components/explore/ExploreMediaCarousel';
import { ExplorePodOverlay } from '@/components/explore/ExplorePodOverlay';

interface ExplorePodCardProps {
  pod: ExplorePod;
  club?: ExploreClub;
  width: number;
  height: number;
  saved: boolean;
  like: LikeState;
  onToggleSave: () => void;
  onToggleLike: () => void;
  onOpen: () => void;
}

/** One full-screen reel: media background, info overlay, the right-side action
 * rail (join/like/comment/save/share/open) and the bottom "Join in 2 taps" CTA. */
export function ExplorePodCard({
  pod,
  club,
  width,
  height,
  saved,
  like,
  onToggleSave,
  onToggleLike,
  onOpen,
}: ExplorePodCardProps) {
  const insets = useSafeAreaInsets();
  // Clear the floating bottom nav (≈ insets.bottom + 70).
  const ctaBottom = insets.bottom + 80;
  const railBottom = ctaBottom + 72;
  const cover = club?.club_feature_images_and_videos.find((m) => !!m.url)?.url ?? null;
  const attendees = pod.pod_attendees.length;
  const joinLabel = `${attendees}${pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : ''}`;

  const share = async () => {
    try {
      await Share.share({ message: `${pod.pod_title} — join on Duncit`, title: pod.pod_title });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <YStack width={width} height={height} backgroundColor="#000000" testID={`reel-${pod.pod_id}`}>
      <ExploreMediaCarousel
        media={pod.pod_images_and_videos}
        fallbackUrl={cover}
        width={width}
        height={height}
      />
      <ExplorePodOverlay pod={pod} clubName={club?.club_name} />

      <YStack position="absolute" right={12} bottom={railBottom} gap={14} alignItems="center">
        <ExploreActionButton
          testID={`reel-join-${pod.pod_id}`}
          icon="how-to-reg"
          label={joinLabel}
          onPress={onOpen}
        />
        <ExploreActionButton
          testID={`reel-like-${pod.pod_id}`}
          icon={like.liked_by_me ? 'favorite' : 'favorite-border'}
          label={String(like.like_count)}
          active={like.liked_by_me}
          onPress={onToggleLike}
        />
        <ExploreActionButton
          icon="chat-bubble-outline"
          label={String(pod.comment_count)}
          onPress={onOpen}
        />
        <ExploreActionButton
          testID={`reel-save-${pod.pod_id}`}
          icon={saved ? 'bookmark' : 'bookmark-border'}
          label="Save"
          active={saved}
          onPress={onToggleSave}
        />
        <ExploreActionButton icon="share" label="Share" onPress={share} />
        <ExploreActionButton icon="open-in-new" label="Open" onPress={onOpen} />
      </YStack>

      <XStack
        position="absolute"
        left={10}
        right={10}
        bottom={ctaBottom}
        alignItems="center"
        gap={10}
        padding={10}
        borderRadius={16}
        backgroundColor="rgba(0,0,0,0.46)"
        borderWidth={1}
        borderColor="rgba(255,255,255,0.14)"
      >
        <YStack
          width={36}
          height={36}
          borderRadius={10}
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name="bolt" size={20} color="#ffffff" />
        </YStack>
        <YStack flex={1}>
          <Text color="#ffffff" fontSize={14} fontWeight="900" numberOfLines={1}>
            Join in 2 taps
          </Text>
          <Text color="rgba(255,255,255,0.82)" fontSize={11.5} numberOfLines={1}>
            {podPriceLabel(pod)} · Confirm with UPI
          </Text>
        </YStack>
        <XStack
          testID={`reel-go-${pod.pod_id}`}
          role="button"
          aria-label="Open pod"
          onPress={onOpen}
          alignItems="center"
          gap={4}
          backgroundColor="$primary"
          borderRadius={12}
          paddingHorizontal={14}
          paddingVertical={9}
          pressStyle={{ opacity: 0.85 }}
        >
          <Text color="$onPrimary" fontSize={13} fontWeight="900">
            Go
          </Text>
          <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
        </XStack>
      </XStack>
    </YStack>
  );
}
