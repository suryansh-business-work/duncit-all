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
  viewer_claimed: boolean;
  pod_id?: string | null;
  expected_host_earnings?: number | null;
}

/** One enrolment tick: amber while `done` is false, green once it is true. */
export interface AutoPodTick {
  role: AutoPodRole;
  done: boolean;
}

/**
 * The three ticks, always in enrolment order — Venue first because nothing can
 * happen until a venue commits a date, then Host and Club Admin, which run in
 * parallel. Always three entries, so a card's tick row never changes width as
 * partners enrol.
 */
export function autoPodTicks(row: Pick<AutoPodRow, 'venue_claim' | 'host_claim' | 'club_claim'>): AutoPodTick[] {
  return [
    { role: 'venue', done: !!row.venue_claim },
    { role: 'host', done: !!row.host_claim },
    { role: 'club', done: !!row.club_claim },
  ];
}

/** How many of the three have enrolled. */
export function autoPodEnrolledCount(row: Pick<AutoPodRow, 'venue_claim' | 'host_claim' | 'club_claim'>): number {
  return autoPodTicks(row).filter((tick) => tick.done).length;
}

/**
 * Can this role still act on this row? The server enforces the same rule on
 * every mutation — this only decides whether to draw the button.
 */
export function autoPodActionable(row: AutoPodRow, role: AutoPodRole): boolean {
  if (row.viewer_claimed) return false;
  if (role === 'venue') return row.stage === 'OPEN' && !row.venue_claim;
  if (role === 'host') return row.stage === 'CLAIMING' && !row.host_claim;
  return row.stage === 'CLAIMING' && !row.club_claim;
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

/** Who the row is still waiting on, or null once it is live (or gone). */
export function autoPodWaitingOn(row: AutoPodRow): AutoPodRole | null {
  if (row.stage !== 'OPEN' && row.stage !== 'CLAIMING') return null;
  if (!row.venue_claim) return 'venue';
  if (!row.host_claim) return 'host';
  if (!row.club_claim) return 'club';
  return null;
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
