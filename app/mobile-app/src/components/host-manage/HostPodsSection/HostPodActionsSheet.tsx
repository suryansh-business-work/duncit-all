import { canAmendPod, canCompletePod, podScanWindow } from '@duncit/utils';

import { isVenueRejected } from '@/utils/venue-approval';
import { PodActionsSheet } from '@/components/host-manage/PodActionsSheet';
import type { HostPod } from '@/hooks/useHostPods';

import type { HostPodSheetState } from './useHostPodSheets';

/** The per-pod actions sheet, wired to the shared sheet state: every action
 * closes it and opens the sheet, dialog or screen it names. */
export function HostPodActionsSheet({ s }: Readonly<{ s: HostPodSheetState }>) {
  const { actionsPod, setActionsPod, navigation, mediaLink, feedbackLink } = s;

  /** Run one of the rating-link actions on the pod the sheet is open for. */
  const withActionsPod = (action: (pod: HostPod) => Promise<unknown> | void) => () => {
    // A dismissed share sheet rejects on iOS — that is the host closing it,
    // not a failure worth showing them.
    if (actionsPod) Promise.resolve(action(actionsPod)).catch(() => undefined);
    setActionsPod(null);
  };

  return (
    <PodActionsSheet
      open={!!actionsPod}
      podTitle={actionsPod?.pod_title ?? ''}
      venueRejected={isVenueRejected(actionsPod?.venue_approval_status)}
      canComplete={canCompletePod(actionsPod ?? {})}
      scanWindow={podScanWindow(actionsPod ?? {})}
      canAmend={canAmendPod(actionsPod ?? {})}
      onClose={() => setActionsPod(null)}
      onScan={() => {
        if (actionsPod) s.setScanPod({ id: actionsPod.id, pod_title: actionsPod.pod_title });
        setActionsPod(null);
      }}
      onSeeAttendance={() => {
        if (actionsPod) navigation.navigate('PodAttendance', { podId: actionsPod.id });
        setActionsPod(null);
      }}
      onChallenges={() => {
        if (actionsPod) navigation.navigate('HostPodChallenges', { podId: actionsPod.id });
        setActionsPod(null);
      }}
      onSlotRequest={() => {
        if (actionsPod) navigation.navigate('PodPending', { podId: actionsPod.id });
        setActionsPod(null);
      }}
      onComplete={() => {
        if (actionsPod) {
          s.setCompletePod({
            id: actionsPod.id,
            pod_title: actionsPod.pod_title,
            venue_id: actionsPod.venue_id,
          });
        }
        setActionsPod(null);
      }}
      // A venue-rejected pod opens the FULL edit + resubmission flow; every
      // other pod keeps the limited title/description/media edit.
      onEdit={() => {
        if (actionsPod) {
          const target = isVenueRejected(actionsPod.venue_approval_status)
            ? s.setResubmitPod
            : s.setEditPod;
          target(actionsPod);
        }
        setActionsPod(null);
      }}
      onOpenPodMedia={withActionsPod(mediaLink.open)}
      onSharePodMedia={withActionsPod(mediaLink.share)}
      onCopyPodMedia={withActionsPod(mediaLink.copy)}
      onOpenFeedback={withActionsPod(feedbackLink.open)}
      onShareFeedback={withActionsPod(feedbackLink.share)}
      onCopyFeedback={withActionsPod(feedbackLink.copy)}
      onCancel={() => {
        if (actionsPod) s.setDeletePod({ id: actionsPod.id, title: actionsPod.pod_title });
        setActionsPod(null);
      }}
      onClubAdmin={() => {
        s.setClubAdminPod(actionsPod);
        setActionsPod(null);
      }}
      onRequestChange={() => {
        s.setChangePod(actionsPod);
        setActionsPod(null);
      }}
    />
  );
}
