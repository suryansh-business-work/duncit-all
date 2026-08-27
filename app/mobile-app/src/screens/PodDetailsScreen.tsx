import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { backoutAttemptsLeft as attemptsLeftFor } from '@duncit/utils';

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
import {
  usePodActions,
  usePodDetails,
  useResolvedPodId,
  type PodDetail,
  type PodMembershipState,
} from '@/hooks/useDetails';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useMeasuredHeight } from '@/hooks/useMeasuredHeight';
import { useTranslation } from '@/hooks/useTranslation';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { usePodBackout, usePodCancelBackout } from '@/hooks/usePodHistory';
import { toErrorMessage } from '@/utils/errors';
import { JoinFreePodDocument, JoinPodMeetingDocument } from '@/graphql/details';
import { graphqlRequest } from '@/services/graphql.client';
import { podShareLinks } from '@/services/share-link';
import { usePodProductSelection } from '@/hooks/usePodProductSelection';
import type { CartLineMeta } from '@/stores/cart.store';
import { useExploreStore } from '@/stores/explore.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { podShareMessage } from '@/utils/pod-format';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Booking, backout and share actions for the loaded pod — the state the
 * booking bar and its dialogs share. RN twin of mWeb's usePodDetailActions. */
function usePodDetailActions(pod: PodDetail | null, refetch: () => Promise<void>) {
  const { t } = useTranslation();
  const { backout, busy: backingOut } = usePodBackout();
  const { cancelBackout, busy: restoringSpot } = usePodCancelBackout();
  // Seats the booking will take — set by the picker in the bottom bar and
  // carried into Checkout, which re-prices the ticket by it.
  const [seats, setSeats] = useState(1);
  const [backoutOpen, setBackoutOpen] = useState(false);
  const [keepSpotOpen, setKeepSpotOpen] = useState(false);
  const [keepSpotError, setKeepSpotError] = useState<string | null>(null);
  const [joiningFree, setJoiningFree] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  /**
   * A free pod is joined outright — no checkout.
   *
   * The server forces `pod_amount` to 0 on a FREE pod, so sending one through
   * the paid checkout asked it to charge nothing and got "Amount must be
   * greater than 0" back: free pods could not be joined from the app at all.
   * mWeb has always called `joinFreePod` here (rule 27).
   *
   * KNOWN GAP: mWeb also forwards the `?ref=` referral token from the URL. The
   * native PodDetails route has no referral param yet, so a free join from a
   * shared link does not credit the sharer — that needs deep-link plumbing and
   * is its own change.
   */
  const onJoinFree = async () => {
    if (!pod || joiningFree) return;
    setJoiningFree(true);
    setJoinError(null);
    try {
      await graphqlRequest(
        JoinFreePodDocument,
        { podId: pod.id, referral: null, seats },
        { auth: true },
      );
      await refetch();
    } catch (err) {
      setJoinError(toErrorMessage(err, t('mweb.podDetails.couldNotJoin')));
    } finally {
      setJoiningFree(false);
    }
  };

  /**
   * A virtual pod's meeting link, asked for through `joinPodMeeting` rather
   * than read off `pod.meeting_url`: inside the pod window that call marks the
   * booking present as VIRTUAL_JOIN, which is what a virtual host is paid on.
   * A host opening their own link is handed it and marks nothing. mWeb twin.
   */
  const onJoinMeeting = async (podId: string) => {
    const res = await graphqlRequest(JoinPodMeetingDocument, { podId }, { auth: true });
    await refetch();
    return res.joinPodMeeting.meeting_url;
  };

  const onConfirmBackout = async (seats?: number) => {
    /* istanbul ignore next -- the dialog only mounts when `pod` exists */
    if (!pod) return;
    try {
      await backout(pod.id, seats);
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

  const onShare = async () => {
    /* istanbul ignore next -- the share button only mounts when `pod` exists */
    if (!pod) return;
    try {
      // The pod link and its venue map link both go out tracked (rule 40).
      const { message } = podShareMessage(pod, await podShareLinks(pod.id, pod));
      // Deliberately NO `url` — `message` already ends with the pod link, and
      // passing both makes iOS's sheet carry the link as a second item, which
      // is how the shared text arrived with the link written twice. mWeb omits
      // its Web Share `url` field for the same reason (rule 27).
      await Share.share({ message, title: pod.pod_title });
    } catch {
      /* user cancelled */
    }
  };

  return {
    seats,
    setSeats,
    joinError,
    onJoinFree,
    onJoinMeeting,
    backoutOpen,
    setBackoutOpen,
    backingOut,
    onConfirmBackout,
    keepSpotOpen,
    setKeepSpotOpen,
    keepSpotError,
    openKeepSpot,
    onConfirmKeepSpot,
    restoringSpot,
    onShare,
  };
}

type PodDetailActions = ReturnType<typeof usePodDetailActions>;

/** Mirror like changes to the Explore feed banner so the two stay in sync
 * (bug 16). Skip the first settled render so we only push real user actions. */
function useMirrorLikeToExplore(pod: PodDetail | null, liked: boolean, likeCount: number) {
  const didMirrorLike = useRef(false);
  useEffect(() => {
    if (!pod) return;
    if (!didMirrorLike.current) {
      didMirrorLike.current = true;
      return;
    }
    useExploreStore.getState().setLike(pod.id, { liked_by_me: liked, like_count: likeCount });
  }, [pod, liked, likeCount]);
}

/** Re-pull membership when the screen regains focus (e.g. after a successful
 * checkout) so the bar flips to "Pod Booked" without a manual reload. The hook
 * already fetched on mount, so skip the first focus. */
function useRefetchOnFocus(refetch: () => Promise<void>) {
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
}

interface PodShopSectionProps {
  pod: PodDetail;
  /** The `is_product_visible` feature flag. */
  showProducts: boolean;
  selectedProducts: Record<string, number>;
  onSelectionChange: (next: Record<string, number>) => void;
  selectedTotal: number;
  onVariantQuantity: (meta: CartLineMeta, quantity: number) => void;
}

/** The Pod Shop — only when products are gated on and the pod lists some. A
 * variant picked in the detail sheet becomes a cart line for this pod. */
function PodShopSection({
  pod,
  showProducts,
  selectedProducts,
  onSelectionChange,
  selectedTotal,
  onVariantQuantity,
}: Readonly<PodShopSectionProps>) {
  if (!showProducts || !pod.product_requests?.length) return null;
  return (
    <Reveal index={3}>
      <PodShop
        pod={pod}
        selectedProducts={selectedProducts}
        onSelectionChange={onSelectionChange}
        selectedTotal={selectedTotal}
        onVariantQuantity={(row, variant, quantity) =>
          onVariantQuantity(
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
              free_delivery_above: row.free_delivery_above ?? null,
            },
            quantity,
          )
        }
        readOnly={pod.products_enabled === false}
      />
    </Reveal>
  );
}

interface PodBackoutDialogsProps {
  actions: PodDetailActions;
  membershipState: PodMembershipState | null;
  onViewTerms: () => void;
}

/** The Backout and Keep-My-Spot dialogs, with their refund and attempt figures
 * read off the viewer's membership state. */
function PodBackoutDialogs({
  actions,
  membershipState,
  onViewTerms,
}: Readonly<PodBackoutDialogsProps>) {
  const backoutAttemptsLeft = attemptsLeftFor(membershipState);
  return (
    <>
      <BackoutConfirmDialog
        open={actions.backoutOpen}
        busy={actions.backingOut}
        onClose={() => actions.setBackoutOpen(false)}
        onConfirm={actions.onConfirmBackout}
        refundAmount={membershipState?.backout_refund_amount ?? null}
        refundPerSeat={membershipState?.backout_refund_per_seat ?? null}
        mySeats={membershipState?.my_seats ?? 1}
        deductionPct={membershipState?.backout_deduction_pct ?? 0}
        refundCoins={membershipState?.backout_refund_coins ?? 0}
        onViewTerms={onViewTerms}
      />
      <KeepSpotDialog
        open={actions.keepSpotOpen}
        busy={actions.restoringSpot}
        attemptsLeft={backoutAttemptsLeft}
        error={actions.keepSpotError}
        onClose={() => actions.setKeepSpotOpen(false)}
        onConfirm={actions.onConfirmKeepSpot}
      />
    </>
  );
}

/** Pod details — hero gallery + overview card + schedule/map + social bar + pod
 * shop + the accordion stack. Mirrors mWeb's PodDetailsPage. */
export function PodDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = useGoBack();
  const { t } = useTranslation();
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
    spotFills,
    seatsByUser,
    categoryCrumbs,
    isLoading,
    refetch,
  } = usePodDetails(podId);
  const { liked, likeCount, saved, savePending, toggleLike, toggleSave } = usePodActions(
    pod,
    savedInitially,
  );
  const actions = usePodDetailActions(pod, refetch);
  const { selectedProducts, selectedProductTotal, setSelectedProducts, setVariantQuantity } =
    usePodProductSelection(podId, pod);
  const showProducts = useFeatureFlag('is_product_visible');
  const finance = usePublicFinance();
  const { openClub } = useDetailNav();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDelta, setCommentDelta] = useState(0);
  const isFree = pod?.pod_type === 'FREE';
  // The booking bar floats over the scroll, and its height changes with the
  // viewer's state (host / member / backout / the taller book bar), so the
  // space reserved below the content is measured rather than guessed.
  const { height: bookingBarHeight, onLayout: onBookingBarLayout } = useMeasuredHeight();

  // The viewer hosts THIS pod (pod-specific, independent of their active studio
  // role) — swaps the booking CTA for the Host Studio entry. Mirrors mWeb.
  const isPodHost = !!viewerId && (pod?.pod_hosts_id ?? []).includes(viewerId);
  const commentCount = (pod?.comment_count ?? 0) + commentDelta;
  const saveIcon = saved ? 'bookmark' : 'bookmark-border';

  useMirrorLikeToExplore(pod, liked, likeCount);
  useRefetchOnFocus(refetch);

  let podBody: ReactNode;
  if (resolving || (isLoading && !pod)) {
    podBody = <DetailSkeleton testID="pod-details-loading" />;
  } else if (pod) {
    podBody = (
      <ScrollView flex={1} contentContainerStyle={{ paddingBottom: bookingBarHeight + 16 }}>
        <DetailHero media={pod.pod_images_and_videos} onBack={goBack}>
          <HeroButton
            testID="pod-save"
            icon={saveIcon}
            active={saved}
            loading={savePending}
            onPress={toggleSave}
          />
          <HeroButton testID="pod-share" icon="share" onPress={actions.onShare} />
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
            onJoinMeeting={() => actions.onJoinMeeting(pod.id)}
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
        <PodShopSection
          pod={pod}
          showProducts={showProducts}
          selectedProducts={selectedProducts}
          onSelectionChange={setSelectedProducts}
          selectedTotal={selectedProductTotal}
          onVariantQuantity={setVariantQuantity}
        />
        <Reveal index={4}>
          <PodAccordions
            pod={pod}
            people={people}
            spotFills={spotFills}
            seatsByUser={seatsByUser}
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
          pressStyle={PRESS_STYLE.surface}
          testID="pod-contact-support"
          role="button"
          aria-label={t('mweb.podDetails.contactSupport')}
          onPress={() =>
            navigation.navigate('SupportTickets', { podId: pod.id, podTitle: pod.pod_title })
          }
          paddingHorizontal={16}
          paddingTop={12}
        >
          <Text fontSize={13} fontWeight="600" color="$primary">
            {t('mweb.podDetails.contactSupport')}
          </Text>
        </XStack>
      </ScrollView>
    );
  } else {
    podBody = (
      <YStack flex={1} alignItems="center" justifyContent="center" gap={12} padding={24}>
        <Text color="$muted" testID="pod-details-error">
          {t('mweb.podDetails.notFound')}
        </Text>
        <XStack
          pressStyle={PRESS_STYLE.surface}
          role="button"
          aria-label={t('mweb.common.goBack')}
          onPress={goBack}
        >
          <Text color="$primary" fontWeight="700">
            {t('mweb.common.goBack')}
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

      {actions.joinError ? (
        <Text
          testID="pod-join-error"
          fontSize={12.5}
          color="$danger"
          textAlign="center"
          paddingHorizontal={16}
          paddingBottom={6}
        >
          {actions.joinError}
        </Text>
      ) : null}

      {pod ? (
        <>
          <PodBookingBar
            onLayout={onBookingBarLayout}
            pod={pod}
            isFree={isFree}
            isHost={isPodHost}
            membershipState={membershipState}
            seats={actions.seats}
            onSeatsChange={actions.setSeats}
            onCheckout={
              isFree
                ? () => void actions.onJoinFree()
                : () => navigation.navigate('Checkout', { podId: pod.id, seats: actions.seats })
            }
            onBackout={() => actions.setBackoutOpen(true)}
            onKeepSpot={actions.openKeepSpot}
            restoringSpot={actions.restoringSpot}
            onGoToDashboard={() => {
              useStudioModeStore.getState().setMode('HOST');
              navigation.navigate('HostManage');
            }}
          />
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
          <PodBackoutDialogs
            actions={actions}
            membershipState={membershipState}
            onViewTerms={() => {
              actions.setBackoutOpen(false);
              navigation.navigate('Policy', { slug: 'backout-terms' });
            }}
          />
        </>
      ) : null}
    </YStack>
  );
}
