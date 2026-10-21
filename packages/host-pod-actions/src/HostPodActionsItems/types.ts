/** What the host's overflow-menu rows need from the menu that hosts them. */
export interface HostPodMenuItemsProps {
  /** The pod these rows belong to — keys every row's test id (rule: per-pod
   * rows must be addressable even though only one menu is open at a time). */
  podId?: string;
  /** Hides everything that only makes sense for a pod that gets to run. */
  showAttendeeActions: boolean;
  canComplete: boolean;
  /**
   * The pod's door is open to a scanner — from shortly before the start to the
   * end. False either side of that: the row stays, greyed, with `scanNote`.
   */
  canScan: boolean;
  /** Why the scan row is inert; undefined while it is not. */
  scanNote?: string;
  /**
   * The pod has not ended yet, so its plan can still change. False on a past
   * pod, which greys Edit, Request Change Host and Cancel the same way — all
   * three change something that has already happened.
   */
  canAmend: boolean;
  /** Closes the menu, then runs the action. */
  pick: (action: () => void) => () => void;
  onScan: () => void;
  onComplete: () => void;
  onSeeAttendance?: () => void;
  /** Host Studio's challenge controls for this pod (a page the surface routes to). */
  onChallenges?: () => void;
  onSlotRequest?: () => void;
  onEdit: () => void;
  onOpenPodMedia?: () => void;
  onSharePodMedia?: () => void;
  onCopyPodMedia?: () => void;
  onOpenFeedback: () => void;
  onShareFeedback: () => void;
  onCopyFeedback: () => void;
  onCancel: () => void;
  /** "Host again" — copies this pod's content into a new draft. Open on a past
   * pod too (that is when it is most wanted); absent where the surface has no
   * draft route. */
  onHostAgain?: () => void;
  onClubAdmin?: () => void;
  /** "Request Change Host" — asks Duncit for a different host rather than
   * cancelling the pod. Only appears where the surface passes it. */
  onRequestChange?: () => void;
  /** Already-translated, because the label lives in `changeRequest.*` — a
   * namespace this package's own labels deliberately do not reach into. */
  requestChangeLabel?: string;
  /** "Chat with venue" — opens the pod's private thread with its venue. Only
   * appears where the surface passes it (a pod booked at a venue). */
  onChatWithVenue?: () => void;
  /** Already-translated: the label lives in the surface's `venueChat.*`. */
  chatWithVenueLabel?: string;
}
