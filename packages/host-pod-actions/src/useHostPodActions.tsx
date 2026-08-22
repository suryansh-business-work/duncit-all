import { useState, type ReactNode } from 'react';
import PodCancelDialog from './PodCancelDialog';
import PodCompleteDialog from './pod-complete/PodCompleteDialog';
import PodEditDialog from './PodEditDialog';
import PodResubmitDialog from './pod-resubmit/PodResubmitDialog';
import TicketScanDialog from './ticket-scan/TicketScanDialog';
import { useHostFeedbackLink } from './useHostFeedbackLink';
import { isVenueRejected } from './venue-approval';
import type { HostPodForComplete, HostPodTarget, ScanTarget } from './types';

/** Props for one row's `<HostPodActionsMenu>`, minus the ones it owns itself. */
export interface HostPodMenuHandlers {
  podTitle: string;
  /** The venue refused this pod's slot — the attendee-facing actions are gone. */
  venueRejected: boolean;
  onScan: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onOpenFeedback: () => void;
  onShareFeedback: () => void;
  onCopyFeedback: () => void;
  onCancel: () => void;
}

export interface HostPodActions {
  /** Wires one pod's row menu to the dialogs below. */
  menuHandlers: (pod: HostPodTarget) => HostPodMenuHandlers;
  /** Render once, anywhere under the provider — every dialog lives here. */
  dialogs: ReactNode;
}

/**
 * The five host pod actions as one state machine.
 *
 * mWeb renders them under a card of rows and the Partners console renders them
 * under a table, but the states are identical — which pod is being scanned,
 * completed, edited, resubmitted or cancelled — so the surfaces share the
 * machine and keep only their own list.
 *
 * `onChanged` fires after anything that alters the pod, so the caller refetches
 * whichever list it drew.
 */
export function useHostPodActions(onChanged: () => void): HostPodActions {
  const feedback = useHostFeedbackLink();
  const [scanPod, setScanPod] = useState<ScanTarget | null>(null);
  const [editPod, setEditPod] = useState<HostPodTarget | null>(null);
  const [resubmitPod, setResubmitPod] = useState<HostPodTarget | null>(null);
  const [cancelPod, setCancelPod] = useState<{ id: string; title: string } | null>(null);
  const [completePod, setCompletePod] = useState<HostPodForComplete | null>(null);

  type FeedbackAction = (pod: HostPodTarget) => Promise<unknown> | void;

  // A dismissed share sheet rejects on iOS — that is the host closing it, not a
  // failure worth showing them.
  const fireFeedback = (action: FeedbackAction, pod: HostPodTarget) => {
    Promise.resolve(action(pod)).catch(() => undefined);
  };

  const menuHandlers = (pod: HostPodTarget): HostPodMenuHandlers => ({
    podTitle: pod.pod_title,
    venueRejected: isVenueRejected(pod.venue_approval_status),
    onScan: () => setScanPod({ id: pod.id, pod_title: pod.pod_title }),
    onComplete: () =>
      setCompletePod({ id: pod.id, pod_title: pod.pod_title, venue_id: pod.venue_id }),
    // A venue-rejected pod opens the FULL edit + resubmission flow; every other
    // pod keeps the limited title/description/media edit.
    onEdit: () => (isVenueRejected(pod.venue_approval_status) ? setResubmitPod : setEditPod)(pod),
    onOpenFeedback: () => feedback.open(pod),
    onShareFeedback: () => fireFeedback(feedback.share, pod),
    onCopyFeedback: () => fireFeedback(feedback.copy, pod),
    onCancel: () => setCancelPod({ id: pod.id, title: pod.pod_title }),
  });

  const settle = (close: () => void) => () => {
    close();
    onChanged();
  };

  const dialogs = (
    <>
      <TicketScanDialog pod={scanPod} onClose={() => setScanPod(null)} />
      <PodEditDialog
        pod={editPod}
        onClose={() => setEditPod(null)}
        onSaved={settle(() => setEditPod(null))}
      />
      <PodResubmitDialog
        pod={resubmitPod}
        onClose={() => setResubmitPod(null)}
        onSaved={settle(() => setResubmitPod(null))}
      />
      <PodCancelDialog
        podId={cancelPod?.id ?? null}
        podTitle={cancelPod?.title ?? ''}
        onClose={() => setCancelPod(null)}
        onCancelled={settle(() => setCancelPod(null))}
      />
      <PodCompleteDialog
        key={completePod?.id ?? 'none'}
        pod={completePod}
        onClose={() => setCompletePod(null)}
        onCompleted={settle(() => setCompletePod(null))}
      />
    </>
  );

  return { menuHandlers, dialogs };
}
