import type { Dispatch, SetStateAction } from 'react';
import { usePodRentalPicks } from '@/stores/rental-picks.store';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PodBookingBar } from '@/components/details/PodBookingBar';
import { PodCommentsSheet } from '@/components/details/pod-comments';
import { LocationMismatchDialog } from '@/components/LocationMismatchDialog';
import type { PodDetail, PodMembershipState, usePodDetails } from '@/hooks/useDetails';
import type { useLocationMismatch } from '@/hooks/useLocationMismatch';
import type { useMeasuredHeight } from '@/hooks/useMeasuredHeight';
import { useExploreStore } from '@/stores/explore.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

import { BookingClashDialog } from '@/components/details/BookingClashDialog';

import { PodBackoutDialogs } from './PodBackoutDialogs';
import type { PodDetailActions } from './usePodDetailActions';
import { useBookingClashGuard } from './useBookingClashGuard';

type PodDetailsData = ReturnType<typeof usePodDetails>;

interface PodDetailsOverlaysProps {
  pod: PodDetail;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  actions: PodDetailActions;
  isFree: boolean;
  isPodHost: boolean;
  membershipState: PodMembershipState | null;
  onBookingBarLayout: ReturnType<typeof useMeasuredHeight>['onLayout'];
  commentsOpen: boolean;
  setCommentsOpen: (open: boolean) => void;
  viewerId: PodDetailsData['viewerId'];
  viewerPhoto: PodDetailsData['viewerPhoto'];
  setCommentDelta: Dispatch<SetStateAction<number>>;
  locationPrompt: ReturnType<typeof useLocationMismatch>;
}

/** The booking bar and every sheet/dialog floating over the loaded pod. */
export function PodDetailsOverlays({
  pod,
  navigation,
  actions,
  isFree,
  isPodHost,
  membershipState,
  onBookingBarLayout,
  commentsOpen,
  setCommentsOpen,
  viewerId,
  viewerPhoto,
  setCommentDelta,
  locationPrompt,
}: Readonly<PodDetailsOverlaysProps>) {
  // A free pod with items to rent is paid for: the rentals go through checkout.
  const { picks } = usePodRentalPicks(pod.id);
  const freeJoin = isFree && Object.keys(picks).length === 0;
  const clash = useBookingClashGuard();
  // Book runs once the member has seen (and accepted) any time clash.
  const guard = (handler: () => void) => () =>
    fireAndForget(
      (async () => {
        if (await clash.check([pod.id])) handler();
      })(),
    );
  return (
    <>
      <PodBookingBar
        onLayout={onBookingBarLayout}
        pod={pod}
        isFree={isFree}
        isHost={isPodHost}
        membershipState={membershipState}
        seats={actions.seats}
        onSeatsChange={actions.setSeats}
        onCheckout={guard(
          freeJoin
            ? () => fireAndForget(actions.onJoinFree())
            : () => navigation.navigate('Checkout', { podId: pod.id, seats: actions.seats }),
        )}
        onBackout={() => actions.setBackoutOpen(true)}
        onKeepSpot={actions.openKeepSpot}
        onCancelSpot={() => actions.setCancelSpotOpen(true)}
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
      <BookingClashDialog
        guard={clash}
        onOpenPod={(clubSlug, podSlug) => navigation.push('PodDetails', { clubSlug, podSlug })}
      />
      <LocationMismatchDialog kind="POD" {...locationPrompt} />
      <PodBackoutDialogs
        actions={actions}
        membershipState={membershipState}
        onViewTerms={() => {
          actions.setBackoutOpen(false);
          navigation.navigate('Policy', { slug: 'backout-terms' });
        }}
      />
    </>
  );
}
