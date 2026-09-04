/**
 * Auto Pod logic shared by every surface that renders one — mWeb, the native
 * app and the MUI portals. Framework-free on purpose: the native app imports
 * this package directly, so nothing here may reach for React, MUI or Tamagui.
 *
 * The VIEWS stay separate (rule 40: share the logic, never the UI); what lives
 * here is the shape of a row, the three-enrolment derivation every card draws,
 * and the one predicate the role switch consults.
 */

// Type-only, and so erased at build: the copy module imports AutoPodRole back
// from here, and a value import either way would be a real cycle.
import type { AutoPodLabels } from './auto-pod-copy';

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

/**
 * PHYSICAL — a venue enrols and brings the slot. VIRTUAL — there is no venue
 * to enrol, the offer waits on a host and a club only, and the host brings
 * the meeting link and the window when they assign themselves.
 */
export type AutoPodMode = 'PHYSICAL' | 'VIRTUAL';

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
  /** Absent on rows written before the field existed — those are physical. */
  pod_mode?: AutoPodMode | null;
  /** False while an admin has paused the offer. */
  is_active?: boolean;
  /**
   * When the offer is released unless everyone needed has enrolled by then —
   * Pod Settings' assignment window past its roll-out, or the venue window if
   * that closes sooner while it still waits on a venue. Set on every list
   * while the offer is enrolling; null once it is live, cancelled or expired.
   * Every card counts it down.
   */
  expires_at?: string | null;
  /** Account Health points a venue or host loses by withdrawing (Pod Settings). Set on their queues. */
  withdraw_penalty_points?: number | null;
  pod_amount: number;
  no_of_spots: number;
  venue_claim: AutoPodVenueClaim | null;
  host_claim: AutoPodHostClaim | null;
  club_claim: AutoPodClubClaim | null;
  location: AutoPodLocation | null;
  viewer_claimed: boolean;
  pod_id?: string | null;
  expected_host_earnings?: number | null;
  /** Ticket price × the booked space's capacity. Venue queue only. */
  expected_venue_earnings?: number | null;
  /** The club admin's cut under Finance's waterfall. Club queue only. */
  expected_club_earnings?: number | null;
}

/** One enrolment tick: amber while `done` is false, green once it is true. */
export interface AutoPodTick {
  role: AutoPodRole;
  done: boolean;
}

type Claims = Pick<AutoPodRow, 'venue_claim' | 'host_claim' | 'club_claim' | 'pod_mode'>;

const claimOf = (row: Claims, role: AutoPodRole) => {
  if (role === 'venue') return row.venue_claim;
  if (role === 'host') return row.host_claim;
  return row.club_claim;
};

/**
 * The roles this offer needs, in tick order. A virtual offer has no venue to
 * enrol, so its row is two ticks wide; every physical offer is three.
 */
export function autoPodRoles(row: Pick<AutoPodRow, 'pod_mode'>): AutoPodRole[] {
  return AUTO_POD_ROLES.filter((role) => role !== 'venue' || row.pod_mode !== 'VIRTUAL');
}

/**
 * The ticks, always in the same order — Venue, Host, Club Admin — so a card's
 * tick row never changes width or order as partners enrol. Enrolments happen
 * in ANY order; the order here is presentation only.
 */
export function autoPodTicks(row: Claims): AutoPodTick[] {
  return autoPodRoles(row).map((role) => ({ role, done: !!claimOf(row, role) }));
}

/** How many of the needed partners have enrolled. */
export function autoPodEnrolledCount(row: Claims): number {
  return autoPodTicks(row).filter((tick) => tick.done).length;
}

/** Still enrolling — not yet live, cancelled or expired. */
export function autoPodPreLive(stage: AutoPodStage): boolean {
  return stage === 'OPEN' || stage === 'CLAIMING';
}

/**
 * Whose turn it is: enrolment runs venue → host → club admin. A venue acts on
 * an offer with no venue yet; a host once a venue has fixed a slot (at once on
 * a virtual offer, which has no venue); a club admin once a host is on it.
 * Null once nobody is missing.
 */
export function autoPodNextRole(row: Claims): AutoPodRole | null {
  return autoPodRoles(row).find((role) => !claimOf(row, role)) ?? null;
}

/**
 * Can this role act on this row? Only when it is that role's turn, the offer
 * is still enrolling, and this viewer has not enrolled already. The server
 * enforces the same order on every mutation — this only decides whether to
 * draw the button.
 */
export function autoPodActionable(row: AutoPodRow, role: AutoPodRole): boolean {
  if (row.viewer_claimed) return false;
  return autoPodPreLive(row.stage) && autoPodNextRole(row) === role;
}

/**
 * Can this viewer take their enrolment back? Any of the three may, while the
 * offer is still enrolling: enrolments happen in ANY order, so a club admin's
 * claim is not necessarily the last one — a club that opened the offer for
 * itself is often the first partner on it. Once everyone needed has enrolled
 * the pod exists and the row is no longer pre-live, which is what closes the
 * door for all three.
 */
export function autoPodWithdrawable(row: AutoPodRow, role: AutoPodRole): boolean {
  if (!row.viewer_claimed) return false;
  return autoPodPreLive(row.stage) && !!claimOf(row, role);
}

/**
 * The "You could earn …" figure for the role whose queue is being read. Each
 * role is paid for something different — the venue for the seats its space
 * holds, the host for what is left after every deduction, the club admin for
 * its cut of the same waterfall — so a shared card must never render one
 * role's number to another. `estimate` is what this viewer worked out for
 * themselves in the potential-earnings dialog and always wins: it is the
 * number they just typed.
 */
export function autoPodRoleEarnings(
  row: AutoPodRow,
  role: AutoPodRole,
  estimate?: number | null
): number | null {
  if (typeof estimate === 'number') return estimate;
  const byRole: Record<AutoPodRole, number | null | undefined> = {
    venue: row.expected_venue_earnings,
    host: row.expected_host_earnings,
    club: row.expected_club_earnings,
  };
  const value = byRole[role];
  return typeof value === 'number' ? value : null;
}

/**
 * What every Auto Pod card needs besides its own row and its buttons. The MUI
 * queue and the Tamagui one take the identical set, so it is named once here
 * rather than written out in both (rule 40).
 */
export interface AutoPodCardChrome {
  role: AutoPodRole;
  labels: AutoPodLabels;
  /** Formats a slot window in the viewer's configured date/time settings. */
  formatWhen: (iso: string) => string;
  /** Formats money in the viewer's currency. */
  formatMoney: (amount: number) => string;
}

/** One titled block of a role's queue. */
export interface AutoPodQueueSection {
  /** 'actionable' takes the role's primary button; 'mine' takes its own. */
  key: 'actionable' | 'mine';
  heading: string;
  rows: AutoPodRow[];
}

/**
 * A role's queue as the two titled blocks every surface draws: what is waiting
 * on them, then what they already enrolled in — the venue's "Assigned slot",
 * the host's "Assigned Auto Pods", the club admin's "Final assigned Auto Pods".
 * Empty blocks are dropped, so a caller renders whatever comes back and never
 * decides for itself which heading applies.
 */
export function autoPodQueueSections(
  rows: AutoPodRow[],
  role: AutoPodRole,
  labels: AutoPodLabels
): AutoPodQueueSection[] {
  const { actionable, mine } = splitAutoPods(rows, role);
  return [
    { key: 'actionable' as const, heading: labels.needsAction, rows: actionable },
    { key: 'mine' as const, heading: labels.assignedHeading(role), rows: mine },
  ].filter((section) => section.rows.length > 0);
}

/**
 * What each partner has worked out for themselves in a potential-earnings
 * calculator, by Auto Pod id, and which card's calculator is open.
 *
 * The figures are deliberately NOT saved anywhere: a potential earning is a
 * partner asking "what if", not a commitment, and persisting it would turn a
 * hypothetical price into something the pod appears to carry.
 */
export interface AutoPodEarningsState {
  row: AutoPodRow | null;
  open: (row: AutoPodRow) => void;
  close: () => void;
  /** What the open calculator has worked out — null clears the card's figure. */
  record: (amount: number | null) => void;
  values: Readonly<Record<string, number>>;
}

/**
 * The earnings map with one Auto Pod's figure set, cleared (null), or left
 * exactly as it was. Returning the SAME object when nothing changed is what
 * keeps a calculator that re-reports the same number from re-rendering the
 * whole queue behind it.
 */
export function autoPodEarningsPatch(
  values: Readonly<Record<string, number>>,
  id: string,
  amount: number | null
): Readonly<Record<string, number>> {
  if (amount === null) {
    if (!(id in values)) return values;
    const { [id]: _cleared, ...rest } = values;
    return rest;
  }
  return values[id] === amount ? values : { ...values, [id]: amount };
}

/** One bookable space at a venue — a named capacity the venue published. */
export interface AutoPodVenueSpace {
  label: string;
  capacity: number;
}

/**
 * The spaces the venue's potential-earnings calculator lists. A venue that
 * named none is one undivided room, so its scalar capacity stands in as a
 * single unnamed space rather than the dialog opening empty; a venue with
 * neither has nothing to project and gets an empty list.
 */
export function autoPodVenueSpaces(
  venue: { capacity?: number | null; capacity_items?: readonly AutoPodVenueSpace[] | null } | null
): AutoPodVenueSpace[] {
  const named = (venue?.capacity_items ?? []).filter((item) => item.capacity > 0);
  if (named.length > 0) return named.map((item) => ({ label: item.label, capacity: item.capacity }));
  const whole = venue?.capacity ?? 0;
  return whole > 0 ? [{ label: '', capacity: whole }] : [];
}

/**
 * What one space could gross: the ticket price every attendee pays times the
 * seats it holds. Null when either half is missing, so the dialog shows the
 * row without inventing a ₹0 earning for a price nobody has typed yet.
 */
export function autoPodSpaceEarnings(ticketPrice: number, capacity: number): number | null {
  if (ticketPrice <= 0 || capacity <= 0) return null;
  return ticketPrice * capacity;
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
  return autoPodRoles(row).filter((role) => !claimOf(row, role));
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

/**
 * Has a host priced this offer yet? The template carries no ticket price or
 * spots — the host sets both when they assign themselves — so until then a
 * card draws no price and no spot count rather than "₹0" and "0".
 */
export function autoPodPriced(row: Pick<AutoPodRow, 'pod_amount' | 'no_of_spots'>): boolean {
  return row.pod_amount > 0 && row.no_of_spots > 0;
}

/** What a host types to take a VIRTUAL offer: where members join, and when. */
export interface AutoPodHostMeeting {
  meeting_platform: string;
  meeting_url: string;
  pod_date_time: Date | null;
  pod_end_date_time: Date | null;
}

/** An http(s) URL, and nothing else — the same rule the server refuses on. */
function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Can the host's "Assign Myself" go ahead with these meeting details? Only
 * consulted on a VIRTUAL offer — a physical one takes its window from the
 * venue's slot. The link must be an http(s) URL, the start must be ahead of
 * `nowMs`, and the end after the start; the server re-checks all three.
 */
export function autoPodHostMeetingReady(meeting: AutoPodHostMeeting, nowMs: number): boolean {
  const start = meeting.pod_date_time?.getTime() ?? Number.NaN;
  const end = meeting.pod_end_date_time?.getTime() ?? Number.NaN;
  return isHttpUrl(meeting.meeting_url.trim()) && start > nowMs && end > start;
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

/** What a countdown says: whole hours, the minutes over, and the seconds over. */
export interface AutoPodTimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * How long until `iso` — for the card's "Expires in …" line, re-read every
 * second. Null when there is no deadline, or once it has passed; seconds are
 * rounded UP so the line never reads "0h 0m 0s" while the offer is still there.
 */
export function autoPodTimeLeft(iso: string | null | undefined, nowMs: number): AutoPodTimeLeft | null {
  if (!iso) return null;
  const left = new Date(iso).getTime() - nowMs;
  if (!Number.isFinite(left) || left <= 0) return null;
  const secondsTotal = Math.ceil(left / 1000);
  return {
    hours: Math.floor(secondsTotal / 3600),
    minutes: Math.floor((secondsTotal % 3600) / 60),
    seconds: secondsTotal % 60,
  };
}
