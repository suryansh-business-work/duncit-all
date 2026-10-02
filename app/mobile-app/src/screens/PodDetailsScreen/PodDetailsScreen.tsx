import { useState, type ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { useGoBack } from '@/hooks/useGoBack';
import { AppBackground } from '@/components/AppBackground';
import { DetailSkeleton } from '@/components/Skeleton';
import { useDetailNav } from '@/hooks/useDetailNav';
import { usePodActions, usePodDetails, useResolvedPodId } from '@/hooks/useDetails';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useLocationMismatch } from '@/hooks/useLocationMismatch';
import { useMeasuredHeight } from '@/hooks/useMeasuredHeight';
import { useTranslation } from '@/hooks/useTranslation';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { usePodProductSelection } from '@/hooks/usePodProductSelection';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useMirrorLikeToExplore, useRefetchOnFocus } from './podDetailsEffects';
import { PodDetailsContent } from './PodDetailsContent';
import { PodDetailsOverlays } from './PodDetailsOverlays';
import { usePodDetailActions } from './usePodDetailActions';

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
  // A virtual pod is joined from anywhere, so its listing city is not a place
  // the viewer has to be in. Mirrors mWeb.
  const locationPrompt = useLocationMismatch(
    pod && pod.pod_mode !== 'VIRTUAL' ? { id: pod.location_id, zone: pod.zone_name } : null,
  );
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
      <PodDetailsContent
        pod={pod}
        venue={venue}
        location={location}
        people={people}
        spotFills={spotFills}
        seatsByUser={seatsByUser}
        categoryCrumbs={categoryCrumbs}
        refetch={refetch}
        navigation={navigation}
        goBack={goBack}
        actions={actions}
        bookingBarHeight={bookingBarHeight}
        isPodHost={isPodHost}
        isFree={isFree}
        saved={saved}
        saveIcon={saveIcon}
        savePending={savePending}
        toggleSave={toggleSave}
        liked={liked}
        likeCount={likeCount}
        commentCount={commentCount}
        toggleLike={toggleLike}
        onOpenComments={() => setCommentsOpen(true)}
        showProducts={showProducts}
        selectedProducts={selectedProducts}
        onSelectionChange={setSelectedProducts}
        selectedTotal={selectedProductTotal}
        onVariantQuantity={setVariantQuantity}
        finance={finance}
        openClub={openClub}
      />
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
          tabIndex={0}
          aria-label={t('mweb.common.goBack')}
          onPress={goBack}
        >
          <Text color="$accent" fontWeight="700">
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
          role="alert"
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
        <PodDetailsOverlays
          pod={pod}
          navigation={navigation}
          actions={actions}
          isFree={isFree}
          isPodHost={isPodHost}
          membershipState={membershipState}
          onBookingBarLayout={onBookingBarLayout}
          commentsOpen={commentsOpen}
          setCommentsOpen={setCommentsOpen}
          viewerId={viewerId}
          viewerPhoto={viewerPhoto}
          setCommentDelta={setCommentDelta}
          locationPrompt={locationPrompt}
        />
      ) : null}
    </YStack>
  );
}
