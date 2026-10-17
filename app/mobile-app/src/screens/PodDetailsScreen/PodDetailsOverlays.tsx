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

import { SeriesBookingSheet } from '@/components/details/series/SeriesBookingSheet';
import { formatMoney } from '@/utils/checkout-math';

import { PodBackoutDialogs } from './PodBackoutDialogs';
import type { PodDetailActions } from './usePodDetailActions';
import type { SeriesBooking } from './useSeriesBooking';

type PodDetailsData = ReturnType<typeof usePodDetails>;

interface PodDetailsOverlaysProps {
  pod: PodDetail;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  actions: PodDetailActions;
  series: SeriesBooking;
  /** The platform currency symbol, for the date picker's prices. */
  currency: string;
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
  series,
  currency,
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
        onCheckout={series.guard(
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
      <SeriesBookingSheet
        series={series}
        isFree={isFree}
        formatPrice={(amount) => formatMoney(currency, amount)}
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
