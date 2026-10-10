import type { PodScanWindow } from '@duncit/utils';

export interface PodActionsSheetProps {
  open: boolean;
  podTitle: string;
  /**
   * The venue refused this pod's slot, so it never ran and never sold a seat.
   * Scanning tickets, marking attendance, completing it and asking guests to
   * rate it are all meaningless then — the host resubmits or cancels instead.
   */
  venueRejected: boolean;
  /**
   * The pod has ended. Completion is the settlement — it prices the payout off
   * the seats scanned in — so it is offered on a PAST pod only: an upcoming or
   * ongoing pod would freeze the answer while the door is still open.
   */
  canComplete: boolean;
  /**
   * Where the pod's door stands for a scanner — open from shortly before the
   * start to the end. Either side of that the row stays but goes inert, with a
   * line under it saying "not yet" or "too late" — the same thing mWeb's menu
   * does with a disabled item (rule 27).
   */
  scanWindow: PodScanWindow;
  /**
   * The pod has not ended yet, so its plan can still change. Once it is over,
   * Edit, Request Change Host and Cancel all go inert with a line under each
   * saying why — the same three rows mWeb greys (rule 27).
   */
  canAmend: boolean;
  onClose: () => void;
  onScan: () => void;
  onSeeAttendance: () => void;
  /** Opens Host Studio's challenge controls for this pod. */
  onChallenges: () => void;
  /** Opens the pod's "Slot Request Sent" screen — the venue decision, re-checkable. */
  onSlotRequest: () => void;
  onComplete: () => void;
  onEdit: () => void;
  /** The pod's media upload screen and the link to it — the same three actions. */
  onOpenPodMedia: () => void;
  onSharePodMedia: () => void;
  onCopyPodMedia: () => void;
  onOpenFeedback: () => void;
  onShareFeedback: () => void;
  onCopyFeedback: () => void;
  onCancel: () => void;
  onClubAdmin: () => void;
  /** "Request Change Host" — asks Duncit for a different host instead of
   * cancelling the pod and refunding everyone. The mWeb twin makes it an
   * optional menu item for the same reason: a surface with no board to answer
   * it on should not offer it. */
  onRequestChange?: () => void;
}
