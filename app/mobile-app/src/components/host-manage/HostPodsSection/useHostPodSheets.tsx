import { useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useDetailNav } from '@/hooks/useDetailNav';
import type { RootStackParamList } from '@/navigation/types';
import { useFeedbackLinkActions, usePodMediaLinkActions } from '@/hooks/usePodLinkActions';
import type { HostPod } from '@/hooks/useHostPods';
import { isVenueRejected } from '@/utils/venue-approval';
import { PodActionsSheet } from '@/components/host-manage/PodActionsSheet';
import { PodClubAdminSheet } from '@/components/host-manage/PodClubAdminSheet';
import { TicketScanDialog, type ScanTarget } from '@/components/host-manage/ticket-scan';
import { PodDeleteDialog } from '@/components/host-manage/PodDeleteDialog';
import { PodEditDialog } from '@/components/host-manage/PodEditDialog';
import { PodCompleteDialog } from '@/components/host-manage/PodCompleteDialog';
import { PodResubmitDialog } from '@/components/host-manage/PodResubmitDialog';
import type { HostPodSummary } from '@/components/host-manage/pod-edit.form';
import type { HostPodForComplete } from '@/components/host-manage/pod-complete.form';
import type { HostPodForResubmit } from '@/components/host-manage/pod-resubmit.form';

interface Options {
  /** Re-reads the host's pods after anything that alters one. */
  refetch: () => Promise<unknown>;
  /** Fired after a pod completes — the screen refetches the Host Share list,
   * which the completion just added a payout to. */
  onPodCompleted?: () => void;
}

export interface HostPodSheets {
  /** Opens the per-pod actions sheet. */
  openActions: (pod: HostPod) => void;
  /** Opens the pod's public detail screen. */
  openPod: (pod: HostPod) => void;
  /** Confirmation line from the last link action, or null. */
  notice: string | null;
  /** Render ONCE — every sheet and dialog the actions open lives here. */
  sheets: ReactNode;
}

/**
 * Every per-pod action of Host Studio as one state machine, so Requested Pods,
 * Your Pods and Rejected Pods share it: a pod keeps exactly the same sheet
 * wherever the venue's decision has put it, and only one set of dialogs is ever
 * mounted. The Tamagui twin of mWeb's `useHostPodActions` (rule 27).
 */
export function useHostPodSheets({ refetch, onPodCompleted }: Readonly<Options>): HostPodSheets {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { openPod: openPodDetail } = useDetailNav();
  const feedbackLink = useFeedbackLinkActions();
  const mediaLink = usePodMediaLinkActions();
  // The whole row, not the narrower edit shape — the sheet routes to complete,
  // resubmit and cancel, which each need different fields off the pod.
  const [actionsPod, setActionsPod] = useState<HostPod | null>(null);
  const [scanPod, setScanPod] = useState<ScanTarget | null>(null);
  const [editPod, setEditPod] = useState<HostPodSummary | null>(null);
  const [resubmitPod, setResubmitPod] = useState<HostPodForResubmit | null>(null);
  const [deletePod, setDeletePod] = useState<{ id: string; title: string } | null>(null);
  const [completePod, setCompletePod] = useState<HostPodForComplete | null>(null);
  const [clubAdminPod, setClubAdminPod] = useState<HostPod | null>(null);

  const reload = () => {
    refetch().catch(() => undefined);
  };

  /** Run one of the rating-link actions on the pod the sheet is open for. */
  const withActionsPod = (action: (pod: HostPod) => Promise<unknown> | void) => () => {
    // A dismissed share sheet rejects on iOS — that is the host closing it,
    // not a failure worth showing them.
    if (actionsPod) Promise.resolve(action(actionsPod)).catch(() => undefined);
    setActionsPod(null);
  };

  const sheets = (
    <>
      <PodActionsSheet
        open={!!actionsPod}
        podTitle={actionsPod?.pod_title ?? ''}
        venueRejected={isVenueRejected(actionsPod?.venue_approval_status)}
        onClose={() => setActionsPod(null)}
        onScan={() => {
          if (actionsPod) setScanPod({ id: actionsPod.id, pod_title: actionsPod.pod_title });
          setActionsPod(null);
        }}
        onSeeAttendance={() => {
          if (actionsPod) navigation.navigate('PodAttendance', { podId: actionsPod.id });
          setActionsPod(null);
        }}
        onSlotRequest={() => {
          if (actionsPod) navigation.navigate('PodPending', { podId: actionsPod.id });
          setActionsPod(null);
        }}
        onComplete={() => {
          if (actionsPod) {
            setCompletePod({
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
              ? setResubmitPod
              : setEditPod;
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
          if (actionsPod) setDeletePod({ id: actionsPod.id, title: actionsPod.pod_title });
          setActionsPod(null);
        }}
        onClubAdmin={() => {
          setClubAdminPod(actionsPod);
          setActionsPod(null);
        }}
      />
      <PodClubAdminSheet
        pod={clubAdminPod}
        onClose={() => setClubAdminPod(null)}
        onSupport={() => {
          if (clubAdminPod) {
            navigation.navigate('SupportTickets', {
              podId: clubAdminPod.id,
              podTitle: clubAdminPod.pod_title,
            });
          }
          setClubAdminPod(null);
        }}
      />
      <TicketScanDialog
        pod={scanPod}
        onClose={() => setScanPod(null)}
        onOpenProfile={(userId) => {
          setScanPod(null);
          navigation.navigate('PublicProfile', { userId });
        }}
      />
      <PodEditDialog
        pod={editPod}
        onClose={() => setEditPod(null)}
        onSaved={() => {
          setEditPod(null);
          reload();
        }}
      />
      <PodResubmitDialog
        pod={resubmitPod}
        onClose={() => setResubmitPod(null)}
        onSaved={() => {
          setResubmitPod(null);
          reload();
        }}
      />
      <PodDeleteDialog
        podId={deletePod?.id ?? null}
        podTitle={deletePod?.title ?? ''}
        onClose={() => setDeletePod(null)}
        onDeleted={() => {
          setDeletePod(null);
          reload();
        }}
      />
      <PodCompleteDialog
        key={completePod?.id ?? 'none'}
        pod={completePod}
        onClose={() => setCompletePod(null)}
        onCompleted={() => {
          setCompletePod(null);
          reload();
          onPodCompleted?.();
        }}
      />
    </>
  );

  return {
    openActions: setActionsPod,
    openPod: (pod) => openPodDetail(pod.club_slug, pod.pod_id),
    notice: feedbackLink.notice ?? mediaLink.notice ?? null,
    sheets,
  };
}
