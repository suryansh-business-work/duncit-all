/**
 * Request Change — the rules and the row shape, framework-free.
 *
 * Every surface renders this flow: mWeb, the native app, the Partners console
 * and the Admin console. The VIEWS are separate on purpose (MUI on one side,
 * Tamagui on the other), so what lives here is the part that must never differ
 * between them — whether the action may be offered at all, what a status is
 * called, and how a board splits into "waiting on you" and "already answered".
 *
 * Zero dependencies: both mobile Dockerfiles already copy `@duncit/utils`, and
 * anything reaching for React here would break the native build (rule 40).
 */

/** Which of a pod's three partner places a request is about. */
export type PodChangeRole = 'VENUE' | 'HOST' | 'CLUB_ADMIN';

export type PodChangeStatus = 'OPEN' | 'OFFERED' | 'RESOLVED' | 'WITHDRAWN';

export type PodChangeResolution = 'NONE' | 'REPLACED' | 'POD_CANCELLED';

export type PodChangeOfferStatus = 'PENDING' | 'APPROVED' | 'PASSED';

export interface PodChangeContact {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
}

export interface PodChangePodRef {
  id: string;
  pod_slug: string;
  pod_title: string;
  pod_date_time: string;
  club_slug: string;
  attendee_count: number;
}

export interface PodChangeOffer {
  user_id: string;
  display_name: string;
  contact: PodChangeContact;
  venue_id: string | null;
  venue_name: string;
  venue_slot_id: string | null;
  slot_start_at: string | null;
  slot_end_at: string | null;
  slot_price: number;
  club_id: string | null;
  status: PodChangeOfferStatus;
  offered_at: string;
  responded_at: string | null;
  pass_reason: string;
}

export interface PodChangeEvent {
  action: string;
  actor_name: string;
  note: string;
  at: string;
}

/** The row every surface renders. Mirrors the `PodChangeRequest` SDL type. */
export interface PodChangeRow {
  id: string;
  change_request_no: string;
  role: PodChangeRole;
  status: PodChangeStatus;
  resolution: PodChangeResolution;
  reason: string;
  health_penalty: number;
  attendees_at_request: number;
  pod: PodChangePodRef;
  pod_cancelled: boolean;
  requested_by: PodChangeContact;
  from_venue_id: string | null;
  from_venue_name: string;
  from_club_id: string | null;
  from_club_name: string;
  offer: PodChangeOffer | null;
  offer_history: PodChangeOffer[];
  events: PodChangeEvent[];
  created_at: string;
  resolved_at: string | null;
}

/** The three penalties, as the studio card and the confirm dialog read them. */
export interface PodChangePenalties {
  venue_penalty: number;
  host_penalty: number;
  club_admin_penalty: number;
}

/** What one role's request currently costs, from the board's own numbers. */
export function changePenaltyFor(
  penalties: PodChangePenalties | null | undefined,
  role: PodChangeRole,
): number {
  if (!penalties) return 0;
  if (role === 'VENUE') return penalties.venue_penalty;
  if (role === 'HOST') return penalties.host_penalty;
  return penalties.club_admin_penalty;
}

/** A request that has not been settled yet — the two states that hold the
 * "one live request per pod per role" lock. */
export const isChangeRequestLive = (row: Pick<PodChangeRow, 'status'>): boolean =>
  row.status === 'OPEN' || row.status === 'OFFERED';

/**
 * May this pod be asked about at all?
 *
 * A cancelled or completed pod has nothing left to hand over, and the server
 * refuses both — this is what stops the action being OFFERED in the first
 * place, so a partner never taps something that can only fail.
 */
export function canRequestPodChange(
  pod: Readonly<{ completed_at?: string | null; cancelled_at?: string | null; is_deleted?: boolean }>,
): boolean {
  return !pod.completed_at && !pod.cancelled_at && !pod.is_deleted;
}

/**
 * Why the action is closed, or null when it is open.
 *
 * Returned as a translation KEY rather than a sentence so the caller's own
 * translator renders it — the same arrangement `venueCancelDisabledText` uses.
 */
export function changeRequestBlockedKey(
  pod: Readonly<{ completed_at?: string | null; cancelled_at?: string | null; is_deleted?: boolean }>,
  openRequest: Readonly<{ status: PodChangeStatus }> | null | undefined,
): string | null {
  if (!canRequestPodChange(pod)) return 'changeRequest.blockedClosed';
  if (openRequest && isChangeRequestLive(openRequest)) return 'changeRequest.blockedOpen';
  return null;
}

/** The menu label key for one role. Literal strings, never composed — the
 * translation gate greps for `t('…')` and cannot see a built key. */
export function changeRequestMenuKey(role: PodChangeRole): string {
  if (role === 'VENUE') return 'changeRequest.menuVenue';
  if (role === 'HOST') return 'changeRequest.menuHost';
  return 'changeRequest.menuClubAdmin';
}

/** The confirm-dialog body key for one role. */
export function changeRequestConfirmKey(role: PodChangeRole): string {
  if (role === 'VENUE') return 'changeRequest.confirmVenue';
  if (role === 'HOST') return 'changeRequest.confirmHost';
  return 'changeRequest.confirmClubAdmin';
}

/** The role's own name, for a chip. */
export function changeRequestRoleKey(role: PodChangeRole): string {
  if (role === 'VENUE') return 'changeRequest.roleVenue';
  if (role === 'HOST') return 'changeRequest.roleHost';
  return 'changeRequest.roleClubAdmin';
}

/**
 * What a row's state is called.
 *
 * A RESOLVED row says HOW it resolved rather than the bare word: "Replaced" and
 * "Pod cancelled and refunded" are completely different outcomes for the person
 * who asked, and one label for both would hide the one that costs them money.
 */
export function changeRequestStatusKey(
  row: Pick<PodChangeRow, 'status' | 'resolution'>,
): string {
  if (row.status === 'OPEN') return 'changeRequest.statusOpen';
  if (row.status === 'OFFERED') return 'changeRequest.statusOffered';
  if (row.status === 'WITHDRAWN') return 'changeRequest.statusWithdrawn';
  if (row.resolution === 'POD_CANCELLED') return 'changeRequest.resolvedCancelled';
  if (row.resolution === 'REPLACED') return 'changeRequest.resolvedReplaced';
  return 'changeRequest.statusResolved';
}

/** MUI chip colour / native tone name for a row's state. */
export type PodChangeTone = 'warning' | 'info' | 'success' | 'error' | 'default';

export function changeRequestTone(
  row: Pick<PodChangeRow, 'status' | 'resolution'>,
): PodChangeTone {
  if (row.status === 'OPEN') return 'warning';
  if (row.status === 'OFFERED') return 'info';
  if (row.status === 'WITHDRAWN') return 'default';
  if (row.resolution === 'POD_CANCELLED') return 'error';
  return 'success';
}

/**
 * The board, split the way every studio section renders it: what still needs an
 * answer above what no longer does.
 *
 * `incoming` arrives already filtered by the server to offers addressed to the
 * viewer, so the split here is only over the viewer's OWN requests.
 */
export function splitChangeRequests(rows: readonly PodChangeRow[]): {
  live: PodChangeRow[];
  settled: PodChangeRow[];
} {
  const live: PodChangeRow[] = [];
  const settled: PodChangeRow[] = [];
  for (const row of rows) {
    if (isChangeRequestLive(row)) live.push(row);
    else settled.push(row);
  }
  return { live, settled };
}

/** May the requester still pull this back? Only before anybody was offered it. */
export const canWithdrawChangeRequest = (row: Pick<PodChangeRow, 'status'>): boolean =>
  row.status === 'OPEN';

/** The public pod address a row links to, or null when the pod has no slugs. */
export function changeRequestPodLink(row: Pick<PodChangeRow, 'pod'>): string | null {
  const { club_slug: club, pod_slug: pod } = row.pod;
  if (!club || !pod) return null;
  return `/club/${club}/pod/${pod}`;
}
