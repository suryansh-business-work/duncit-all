import type { HostPodMenuHandlers } from '@duncit/host-pod-actions';

/**
 * Everything a hosted-pod row needs beyond the pod itself.
 *
 * Supplied by the sections container, which owns the ONE action state machine
 * behind Requested Pods, Your Pods and Rejected Pods — so a pod moving between
 * the three keeps exactly the same menu.
 */
export interface HostPodRowActions {
  actions: HostPodMenuHandlers;
  /** Opens the club-admin card — mWeb's own dialog, not one the package owns. */
  onClubAdmin: () => void;
  /** Opens the pod's attendance PAGE — a route, so mWeb owns the navigation. */
  onSeeAttendance: () => void;
  /** Opens the pod's "Slot Request Sent" PAGE — a route, same as above. */
  onSlotRequest: () => void;
  /** "Request Change Host" — asks Duncit for a different host instead of
   * cancelling the pod and refunding everyone who booked. */
  onRequestChange: () => void;
  /** Already translated: the label lives in `changeRequest.*`, a namespace
   * @duncit/host-pod-actions' own label builders do not reach into. */
  requestChangeLabel: string;
}
