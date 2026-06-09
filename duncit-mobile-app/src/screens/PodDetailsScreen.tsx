import { useCallback, useRef, useState } from 'react';
import { Share } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { DetailHero, HeroButton } from '@/components/details/DetailHero';
import { PodAccordions } from '@/components/details/PodAccordions';
import { PodBookingBar } from '@/components/details/PodBookingBar';
import { PodCommentsSheet } from '@/components/details/pod-comments';
import { PodInfo } from '@/components/details/PodInfo';
import { PodSchedule } from '@/components/details/PodSchedule';
import { PodShop } from '@/components/details/PodShop';
import { PodSocialBar } from '@/components/details/PodSocialBar';
import { BackoutConfirmDialog } from '@/components/pod-history/BackoutConfirmDialog';
import { DetailSkeleton } from '@/components/Skeleton';
import { usePodActions, usePodDetails } from '@/hooks/useDetails';
import { usePodBackout } from '@/hooks/usePodHistory';
import type { RootStackParamList } from '@/navigation/types';

/** Pod details — hero gallery + overview card + schedule/map + social bar + pod
 * shop + the accordion stack. Mirrors mWeb's PodDetailsPage. */
export function PodDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PodDetails'>>();
  const { podId } = route.params;
  const { pod, venue, location, viewerId, savedInitially, membershipState, isLoading, refetch } =
    usePodDetails(podId);
  const { liked, likeCount, saved, savePending, toggleLike, toggleSave } = usePodActions(
    pod,
    savedInitially,
  );
  const { backout, busy: backingOut } = usePodBackout();
  const [backoutOpen, setBackoutOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDelta, setCommentDelta] = useState(0);
  const isFree = pod?.pod_type?.includes('FREE') ?? false;
  const commentCount = (pod?.comment_count ?? 0) + commentDelta;

  // Re-pull membership when the screen regains focus (e.g. after a successful
  // checkout) so the bar flips to "Pod Booked" without a manual reload. The hook
  // already fetched on mount, so skip the first focus.
  const didFocus = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!didFocus.current) {
        didFocus.current = true;
        return;
      }
      void refetch();
    }, [refetch]),
  );

  const onConfirmBackout = async () => {
    /* istanbul ignore next -- the dialog only mounts when `pod` exists */
    if (!pod) return;
    try {
      await backout(pod.id);
      setBackoutOpen(false);
      await refetch();
    } catch {
      setBackoutOpen(false);
    }
  };

  const share = async () => {
    /* istanbul ignore next -- the share button only mounts when `pod` exists */
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
        <PodBookingBar
          pod={pod}
          isFree={isFree}
          membershipState={membershipState}
          onCheckout={() => navigation.navigate('Checkout', { podId: pod.id })}
          onBackout={() => setBackoutOpen(true)}
        />
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

      {pod ? (
        <BackoutConfirmDialog
          open={backoutOpen}
          busy={backingOut}
          onClose={() => setBackoutOpen(false)}
          onConfirm={onConfirmBackout}
          onViewTerms={() => {
            setBackoutOpen(false);
            navigation.navigate('Policy', { slug: 'backout-terms' });
          }}
        />
      ) : null}
    </YStack>
  );
}
