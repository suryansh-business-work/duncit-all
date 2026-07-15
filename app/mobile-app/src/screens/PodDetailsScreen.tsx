import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Share } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { useGoBack } from '@/hooks/useGoBack';
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
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { usePodBackout } from '@/hooks/usePodHistory';
import { usePodProductSelection } from '@/hooks/usePodProductSelection';
import { useExploreStore } from '@/stores/explore.store';
import { isPodExpired, podShareMessage } from '@/utils/pod-format';
import type { RootStackParamList } from '@/navigation/types';

/** Pod details — hero gallery + overview card + schedule/map + social bar + pod
 * shop + the accordion stack. Mirrors mWeb's PodDetailsPage. */
export function PodDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = useGoBack();
  const route = useRoute<RouteProp<RootStackParamList, 'PodDetails'>>();
  const { podId } = route.params;
  const {
    pod,
    venue,
    location,
    viewerId,
    viewerPhoto,
    savedInitially,
    membershipState,
    people,
    categoryCrumbs,
    isLoading,
    refetch,
  } = usePodDetails(podId);
  const { liked, likeCount, saved, savePending, toggleLike, toggleSave } = usePodActions(
    pod,
    savedInitially,
  );
  const { backout, busy: backingOut } = usePodBackout();
  const { selectedProducts, selectedProductList, setSelectedProducts } = usePodProductSelection(
    podId,
    pod,
  );
  const showProducts = useFeatureFlag('is_product_visible');
  const finance = usePublicFinance();
  const [backoutOpen, setBackoutOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDelta, setCommentDelta] = useState(0);
  const isFree = pod?.pod_type?.includes('FREE') ?? false;
  const commentCount = (pod?.comment_count ?? 0) + commentDelta;

  // Mirror like changes to the Explore feed banner so the two stay in sync
  // (bug 16). Skip the first settled render so we only push real user actions.
  const didMirrorLike = useRef(false);
  useEffect(() => {
    if (!pod) return;
    if (!didMirrorLike.current) {
      didMirrorLike.current = true;
      return;
    }
    useExploreStore.getState().setLike(pod.id, { liked_by_me: liked, like_count: likeCount });
  }, [pod, liked, likeCount]);

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
      refetch();
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
      const { message, url } = podShareMessage(pod);
      await Share.share({ message, url, title: pod.pod_title });
    } catch {
      /* user cancelled */
    }
  };

  let podBody: ReactNode;
  if (isLoading && !pod) {
    podBody = <DetailSkeleton testID="pod-details-loading" />;
  } else if (pod) {
    podBody = (
      <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 110 }}>
        <DetailHero media={pod.pod_images_and_videos} onBack={goBack}>
          <HeroButton
            testID="pod-save"
            icon={saved ? 'bookmark' : 'bookmark-border'}
            active={saved}
            loading={savePending}
            onPress={toggleSave}
          />
          <HeroButton testID="pod-share" icon="share" onPress={share} />
        </DetailHero>
        <Reveal index={0}>
          <PodInfo pod={pod} categoryCrumbs={categoryCrumbs} />
        </Reveal>
        <Reveal index={1}>
          <PodSchedule
            pod={pod}
            venue={venue}
            location={location}
            onOpenVenue={(venueId) => navigation.navigate('VenueDetails', { venueId })}
          />
        </Reveal>
        <YStack height={14} />
        <Reveal index={2}>
          <PodSocialBar
            liked={liked}
            likeCount={likeCount}
            commentCount={commentCount}
            onToggleLike={toggleLike}
            onOpenComments={() => setCommentsOpen(true)}
          />
        </Reveal>
        {showProducts && pod.product_requests?.length ? (
          <Reveal index={3}>
            <PodShop
              pod={pod}
              selectedProducts={selectedProducts}
              onSelectionChange={setSelectedProducts}
              readOnly={!!membershipState?.is_member || isPodExpired(pod.pod_date_time)}
            />
          </Reveal>
        ) : null}
        <Reveal index={4}>
          <PodAccordions
            pod={pod}
            people={people}
            categoryCrumbs={categoryCrumbs}
            isFree={isFree}
            gstPct={finance.gstPct}
            currency={finance.currency}
            onOpenClub={() =>
              navigation.navigate('ClubDetails', { clubId: pod.club_id, title: 'Club' })
            }
            onOpenProfile={(userId) => navigation.navigate('PublicProfile', { userId })}
          />
        </Reveal>
        <XStack
          testID="pod-contact-support"
          role="button"
          aria-label="Contact support about this pod"
          onPress={() =>
            navigation.navigate('SupportTickets', { podId: pod.id, podTitle: pod.pod_title })
          }
          paddingHorizontal={16}
          paddingTop={12}
        >
          <Text fontSize={13} fontWeight="800" color="$primary">
            Contact support about this pod
          </Text>
        </XStack>
      </ScrollView>
    );
  } else {
    podBody = (
      <YStack flex={1} alignItems="center" justifyContent="center" gap={12} padding={24}>
        <Text color="$muted" testID="pod-details-error">
          This pod is unavailable.
        </Text>
        <XStack role="button" aria-label="Go back" onPress={goBack}>
          <Text color="$primary" fontWeight="900">
            Go back
          </Text>
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} testID="pod-details-screen">
      <AppBackground />
      {podBody}

      {pod ? (
        <PodBookingBar
          pod={pod}
          isFree={isFree}
          membershipState={membershipState}
          onCheckout={() =>
            navigation.navigate('Checkout', {
              podId: pod.id,
              selectedProducts: selectedProductList,
            })
          }
          onBackout={() => setBackoutOpen(true)}
        />
      ) : null}

      {pod ? (
        <PodCommentsSheet
          podId={pod.id}
          open={commentsOpen}
          viewerId={viewerId}
          viewerPhoto={viewerPhoto}
          onClose={() => setCommentsOpen(false)}
          onCountChange={(delta) => {
            setCommentDelta((prev) => prev + delta);
            useExploreStore.getState().bumpComment(pod.id, delta);
          }}
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
