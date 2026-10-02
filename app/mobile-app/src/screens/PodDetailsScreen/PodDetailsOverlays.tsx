import type { Dispatch, SetStateAction } from 'react';
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

import { PodBackoutDialogs } from './PodBackoutDialogs';
import type { PodDetailActions } from './usePodDetailActions';

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
        onCheckout={
          isFree
            ? () => fireAndForget(actions.onJoinFree())
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
