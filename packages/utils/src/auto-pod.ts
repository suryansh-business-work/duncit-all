/**
 * Auto Pod logic shared by every surface that renders one — mWeb, the native
 * app and the MUI portals. Framework-free on purpose: the native app imports
 * this package directly, so nothing here may reach for React, MUI or Tamagui.
 *
 * The VIEWS stay separate (rule 40: share the logic, never the UI); what lives
 * here is the shape of a row, the three-enrolment derivation every card draws,
 * and the one predicate the role switch consults.
 */

export type AutoPodStage =
  | 'OPEN'
  | 'CLAIMING'
  | 'MATERIALIZING'
  | 'LIVE'
  | 'CANCELLED'
  | 'EXPIRED';

/** Which partner an enrolment belongs to. */
export type AutoPodRole = 'venue' | 'host' | 'club';

/** The three roles, in the order every tick row and "waiting for" line lists them. */
export const AUTO_POD_ROLES: readonly AutoPodRole[] = ['venue', 'host', 'club'];

export interface AutoPodVenueClaim {
  venue_id: string;
  venue_slot_id: string;
  owner_user_id: string;
  venue_name: string;
  pod_date_time: string;
  pod_end_date_time: string | null;
  slot_price: number;
  accepted_at: string;
}

export interface AutoPodHostClaim {
  user_id: string;
  host_name: string;
  assigned_at: string;
}

export interface AutoPodClubClaim {
  club_id: string;
  club_name: string;
  user_id: string;
  claimed_at: string;
}

/**
 * The city (one admin Location row — Country → State → City) the FIRST
 * enrolment pinned the offer to. Null until somebody enrols; from then on only
 * partners in that city are offered it.
 */
export interface AutoPodLocation {
  location_id: string;
  location_name: string;
  country: string;
  state: string;
  city: string;
  bound_by: 'VENUE' | 'HOST' | 'CLUB';
  bound_at: string;
}

/** The selection every Auto Pod list query returns. */
export interface AutoPodRow {
  id: string;
  auto_pod_no: string;
  stage: AutoPodStage;
  pod_title: string;
  pod_description: string;
  pod_images_and_videos: { url: string; type: string }[];
  /** The admin's chosen sub-category. A club may only claim an Auto Pod in its
   * own category (a pod inherits Super + Sub from its club), so the club picker
   * needs this to offer only the clubs the server would accept. */
  sub_category_id: string;
  category_name?: string | null;
  pod_amount: number;
  no_of_spots: number;
  venue_claim: AutoPodVenueClaim | null;
  host_claim: AutoPodHostClaim | null;
  club_claim: AutoPodClubClaim | null;
  location: AutoPodLocation | null;
  viewer_claimed: boolean;
  pod_id?: string | null;
  expected_host_earnings?: number | null;
}

/** One enrolment tick: amber while `done` is false, green once it is true. */
export interface AutoPodTick {
  role: AutoPodRole;
  done: boolean;
}

type Claims = Pick<AutoPodRow, 'venue_claim' | 'host_claim' | 'club_claim'>;

const claimOf = (row: Claims, role: AutoPodRole) => {
  if (role === 'venue') return row.venue_claim;
  if (role === 'host') return row.host_claim;
  return row.club_claim;
};

/**
 * The three ticks, always in the same order — Venue, Host, Club Admin — so a
 * card's tick row never changes width or order as partners enrol. Enrolments
 * happen in ANY order; the order here is presentation only.
 */
export function autoPodTicks(row: Claims): AutoPodTick[] {
  return AUTO_POD_ROLES.map((role) => ({ role, done: !!claimOf(row, role) }));
}

/** How many of the three have enrolled. */
export function autoPodEnrolledCount(row: Claims): number {
  return autoPodTicks(row).filter((tick) => tick.done).length;
}

/** Still enrolling — not yet live, cancelled or expired. */
export function autoPodPreLive(stage: AutoPodStage): boolean {
  return stage === 'OPEN' || stage === 'CLAIMING';
}

/**
 * Can this role still act on this row? Any role may enrol at any point before
 * the pod is live, as long as its own tick is still empty. The server enforces
 * the same rule on every mutation — this only decides whether to draw the
 * button.
 */
export function autoPodActionable(row: AutoPodRow, role: AutoPodRole): boolean {
  if (row.viewer_claimed) return false;
  return autoPodPreLive(row.stage) && !claimOf(row, role);
}

/** Split a role's queue into what needs them and what they already took. */
export function splitAutoPods(
  rows: AutoPodRow[],
  role: AutoPodRole
): { actionable: AutoPodRow[]; mine: AutoPodRow[] } {
  const actionable: AutoPodRow[] = [];
  const mine: AutoPodRow[] = [];
  for (const row of rows) {
    if (autoPodActionable(row, role)) actionable.push(row);
    else if (row.viewer_claimed) mine.push(row);
  }
  return { actionable, mine };
}

/** Every role the row is still waiting on, in tick order; empty once it is
 * live (or gone). */
export function autoPodMissingRoles(row: Pick<AutoPodRow, 'stage'> & Claims): AutoPodRole[] {
  if (!autoPodPreLive(row.stage)) return [];
  return AUTO_POD_ROLES.filter((role) => !claimOf(row, role));
}

/** The first role the row is still waiting on, or null once it is live (or gone). */
export function autoPodWaitingOn(row: Pick<AutoPodRow, 'stage'> & Claims): AutoPodRole | null {
  return autoPodMissingRoles(row)[0] ?? null;
}

/**
 * Can a HOST's "Assign Myself" go ahead with this city selection? An unpinned
 * offer takes its city from the host, so the host must have one selected; a
 * pinned offer already has its city and the selection is not consulted.
 */
export function autoPodHostNeedsLocation(row: Pick<AutoPodRow, 'location'>, locationId: string): boolean {
  return !row.location && !locationId;
}

/** "Bengaluru, Karnataka" — how every card names a pinned city. */
export function autoPodCityLabel(location: AutoPodLocation | null | undefined): string {
  if (!location) return '';
  return [location.city || location.location_name, location.state].filter(Boolean).join(', ');
}

/** Per-role counts of Auto Pods waiting on the signed-in user. */
export interface AutoPodActionCounts {
  venue: number;
  host: number;
  club: number;
}

/** Studio modes that can have Auto Pods waiting for them. */
export type AutoPodStudioMode = 'HOST' | 'VENUE' | 'CLUB';

const MODE_TO_ROLE: Record<AutoPodStudioMode, AutoPodRole> = {
  VENUE: 'venue',
  HOST: 'host',
  CLUB: 'club',
};

/**
 * How many Auto Pods are waiting on a studio mode — 0 for USER and ECOMM,
 * which have no Auto Pod queue.
 *
 * This is the single predicate behind "switching roles lands you on Auto Pods":
 * a switch consults it against already-fetched counts, so it never waits on the
 * network, and any mode with nothing waiting falls through to its usual home.
 */
export function autoPodModeCount(
  counts: AutoPodActionCounts | null | undefined,
  mode: string
): number {
  if (!counts) return 0;
  const role = MODE_TO_ROLE[mode as AutoPodStudioMode];
  if (!role) return 0;
  return counts[role] ?? 0;
}
