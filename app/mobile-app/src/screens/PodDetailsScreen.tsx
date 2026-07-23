import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { useGoBack } from '@/hooks/useGoBack';
import { AdSlot } from '@/components/ads/AdSlot';
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
import { KeepSpotDialog } from '@/components/pod-history/KeepSpotDialog';
import { DetailSkeleton } from '@/components/Skeleton';
import { useDetailNav } from '@/hooks/useDetailNav';
import { usePodActions, usePodDetails, useResolvedPodId } from '@/hooks/useDetails';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { usePodBackout, usePodCancelBackout } from '@/hooks/usePodHistory';
import { toErrorMessage } from '@/utils/errors';
import { usePodProductSelection } from '@/hooks/usePodProductSelection';
import { useExploreStore } from '@/stores/explore.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { podShareMessage } from '@/utils/pod-format';
import type { RootStackParamList } from '@/navigation/types';

/** Pod details — hero gallery + overview card + schedule/map + social bar + pod
 * shop + the accordion stack. Mirrors mWeb's PodDetailsPage. */
export function PodDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = useGoBack();
  const route = useRoute<RouteProp<RootStackParamList, 'PodDetails'>>();
  // Doc id from in-app nav, or resolved from a shared /club/:clubSlug/pod/:podSlug link.
  const { podId, resolving } = useResolvedPodId(route.params);
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
  const { cancelBackout, busy: restoringSpot } = usePodCancelBackout();
  const { selectedProducts, selectedProductTotal, setSelectedProducts, setVariantQuantity } =
    usePodProductSelection(podId, pod);
  const showProducts = useFeatureFlag('is_product_visible');
  const finance = usePublicFinance();
  const { openClub } = useDetailNav();
  const [backoutOpen, setBackoutOpen] = useState(false);
  const [keepSpotOpen, setKeepSpotOpen] = useState(false);
  const [keepSpotError, setKeepSpotError] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDelta, setCommentDelta] = useState(0);
  const isFree = pod?.pod_type?.includes('FREE') ?? false;
  // The viewer hosts THIS pod (pod-specific, independent of their active studio
  // role) — swaps the booking CTA for the Host Studio entry. Mirrors mWeb.
  const isPodHost = !!viewerId && (pod?.pod_hosts_id ?? []).includes(viewerId);
  const commentCount = (pod?.comment_count ?? 0) + commentDelta;
  const backoutAttemptsLeft = Math.max(
    0,
    (membershipState?.backout_attempts_max ?? 0) - (membershipState?.backout_attempts_used ?? 0),
  );

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

  // "Keep My Spot" — a server refusal (replacement confirmed) stays inside the
  // dialog so the user sees why the booking cannot be restored.
  const onConfirmKeepSpot = async () => {
    /* istanbul ignore next -- the dialog only mounts when `pod` exists */
    if (!pod) return;
    setKeepSpotError(null);
    try {
      await cancelBackout(pod.id);
      setKeepSpotOpen(false);
      await refetch();
    } catch (err) {
      setKeepSpotError(toErrorMessage(err));
      await refetch();
    }
  };

  const openKeepSpot = () => {
    setKeepSpotError(null);
    setKeepSpotOpen(true);
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
  if (resolving || (isLoading && !pod)) {
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
              selectedTotal={selectedProductTotal}
              onVariantQuantity={(row, variant, quantity) =>
                setVariantQuantity(
                  {
                    pod_id: pod.id,
                    pod_title: pod.pod_title,
                    club_slug: pod.club_slug,
                    product_id: row.product_id,
                    variant_id: variant.id,
                    variant_label: variant.label,
                    product_name: row.product_name,
                    image_url: variant.image_url || row.image_url,
                    unit_cost: variant.unit_cost,
                    max_quantity: variant.max,
                  },
                  quantity,
                )
              }
              readOnly={pod.products_enabled === false}
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
            onOpenClub={() => openClub(pod.club_slug)}
            onOpenProfile={(userId) => navigation.navigate('PublicProfile', { userId })}
          />
        </Reveal>
        <Reveal index={5}>
          <YStack paddingHorizontal={16}>
            <AdSlot position="POD_DETAILS" variant="banner" />
          </YStack>
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
      {/* Top safe-area: page content must never overlap the device's
          notification/status bar (matches the StackScreen scaffold). */}
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {podBody}
      </SafeAreaView>

      {pod ? (
        <PodBookingBar
          pod={pod}
          isFree={isFree}
          isHost={isPodHost}
          membershipState={membershipState}
          onCheckout={() => navigation.navigate('Checkout', { podId: pod.id })}
          onBackout={() => setBackoutOpen(true)}
          onKeepSpot={openKeepSpot}
          onGoToDashboard={() => {
            useStudioModeStore.getState().setMode('HOST');
            navigation.navigate('HostManage');
          }}
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
          refundAmount={membershipState?.backout_refund_amount ?? null}
          deductionPct={membershipState?.backout_deduction_pct ?? 0}
          onViewTerms={() => {
            setBackoutOpen(false);
            navigation.navigate('Policy', { slug: 'backout-terms' });
          }}
        />
      ) : null}

      {pod ? (
        <KeepSpotDialog
          open={keepSpotOpen}
          busy={restoringSpot}
          attemptsLeft={backoutAttemptsLeft}
          error={keepSpotError}
          onClose={() => setKeepSpotOpen(false)}
          onConfirm={onConfirmKeepSpot}
        />
      ) : null}
    </YStack>
  );
}
