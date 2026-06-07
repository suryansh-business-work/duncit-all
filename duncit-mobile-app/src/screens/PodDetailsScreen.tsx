import { useState } from 'react';
import { Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { DetailHero, HeroButton } from '@/components/details/DetailHero';
import { PodAccordions } from '@/components/details/PodAccordions';
import { PodCommentsSheet } from '@/components/details/pod-comments';
import { PodInfo } from '@/components/details/PodInfo';
import { PodSchedule } from '@/components/details/PodSchedule';
import { PodShop } from '@/components/details/PodShop';
import { PodSocialBar } from '@/components/details/PodSocialBar';
import { DetailSkeleton } from '@/components/Skeleton';
import { usePodActions, usePodDetails } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/** Pod details — hero gallery + overview card + schedule/map + social bar + pod
 * shop + the accordion stack. Mirrors mWeb's PodDetailsPage. */
export function PodDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PodDetails'>>();
  const { podId } = route.params;
  const { pod, venue, location, viewerId, savedInitially, isLoading } = usePodDetails(podId);
  const { liked, likeCount, saved, savePending, toggleLike, toggleSave } = usePodActions(
    pod,
    savedInitially,
  );
  const { onPrimary } = useThemeColors();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDelta, setCommentDelta] = useState(0);
  const isFree = pod?.pod_type?.includes('FREE') ?? false;
  const commentCount = (pod?.comment_count ?? 0) + commentDelta;

  const share = async () => {
    if (!pod) return;
    try {
      await Share.share({ message: `${pod.pod_title} — join on Duncit`, title: pod.pod_title });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <YStack flex={1} testID="pod-details-screen">
      <AppBackground />
      {isLoading && !pod ? (
        <DetailSkeleton testID="pod-details-loading" />
      ) : !pod ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap={12} padding={24}>
          <Text color="$muted" testID="pod-details-error">
            This pod is unavailable.
          </Text>
          <XStack role="button" aria-label="Go back" onPress={() => navigation.goBack()}>
            <Text color="$primary" fontWeight="900">
              Go back
            </Text>
          </XStack>
        </YStack>
      ) : (
        <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 110 }}>
          <DetailHero media={pod.pod_images_and_videos} onBack={() => navigation.goBack()}>
            <HeroButton
              testID="pod-save"
              icon={saved ? 'bookmark' : 'bookmark-border'}
              active={saved}
              loading={savePending}
              onPress={toggleSave}
            />
            <HeroButton testID="pod-share" icon="share" onPress={share} />
          </DetailHero>
          <PodInfo pod={pod} />
          <PodSchedule
            pod={pod}
            venue={venue}
            location={location}
            onOpenVenue={(venueId) => navigation.navigate('VenueDetails', { venueId })}
          />
          <YStack height={14} />
          <PodSocialBar
            liked={liked}
            likeCount={likeCount}
            commentCount={commentCount}
            onToggleLike={toggleLike}
            onOpenComments={() => setCommentsOpen(true)}
          />
          <PodShop pod={pod} />
          <PodAccordions
            pod={pod}
            onOpenClub={() =>
              navigation.navigate('ClubDetails', { clubId: pod.club_id, title: 'Club' })
            }
          />
        </ScrollView>
      )}

      {pod ? (
        <YStack
          position="absolute"
          left={0}
          right={0}
          bottom={0}
          backgroundColor="$background"
          borderTopWidth={1}
          borderColor="$borderColor"
        >
          <SafeAreaView edges={['bottom']}>
            <XStack alignItems="center" gap={12} paddingHorizontal={16} paddingVertical={10}>
              <YStack flex={1}>
                <Text fontSize={11} color="$muted">
                  {isFree ? 'Entry' : 'Price'}
                </Text>
                <Text fontSize={18} fontWeight="900" color="$color">
                  {isFree ? 'Free' : `₹${pod.pod_amount}`}
                </Text>
              </YStack>
              <XStack
                testID="pod-book"
                role="button"
                aria-label={isFree ? 'Join pod' : 'Book pod'}
                onPress={() => navigation.navigate('Checkout', { podId: pod.id })}
                alignItems="center"
                justifyContent="center"
                paddingHorizontal={28}
                height={48}
                borderRadius={999}
                backgroundColor="$primary"
                pressStyle={{ opacity: 0.85 }}
              >
                <Text fontSize={15} fontWeight="900" color={onPrimary}>
                  {isFree ? 'Join' : 'Book now'}
                </Text>
              </XStack>
            </XStack>
          </SafeAreaView>
        </YStack>
      ) : null}

      {pod ? (
        <PodCommentsSheet
          podId={pod.id}
          open={commentsOpen}
          viewerId={viewerId}
          onClose={() => setCommentsOpen(false)}
          onCountChange={(delta) => setCommentDelta((prev) => prev + delta)}
        />
      ) : null}
    </YStack>
  );
}
