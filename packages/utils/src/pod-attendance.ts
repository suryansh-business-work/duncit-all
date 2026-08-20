/**
 * The attendance roster, as logic rather than as a screen.
 *
 * mWeb renders this with MUI and the native app with Tamagui, and rule 40 says
 * the pair shares logic and never UI — so everything both of them have to AGREE
 * on lives here: which rows count as marked, what a row's state is, why the
 * roster is locked, and what the host is allowed to press.
 *
 * Framework-free on purpose: `@duncit/utils` is one of the few packages the
 * native app can consume (it is in both mobile Dockerfiles), so a React or
 * Tamagui import here would break the app build and not the web one.
 */

/** How a booking came to be marked present. Mirrors `AttendanceMarkMethod`. */
export type AttendanceMarkMethod = 'HOST_SCAN' | 'HOST_MANUAL' | 'CLUB_ADMIN_FORCE' | 'ADMIN';

/** Why the roster is read-only, or OPEN when it is not. */
export type PodAttendanceLock = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export type PodAttendanceViewer = 'HOST' | 'CLUB_ADMIN';

/** How a one-time code is carried. The medium is a parameter, never a fork. */
export type OtpMedium = 'SMS' | 'WHATSAPP';

/** Both mediums, in the order the pickers list them. */
export const OTP_MEDIUMS: readonly OtpMedium[] = ['WHATSAPP', 'SMS'];

export interface PodAttendanceCompanion {
  name: string;
  phone_extension: string;
  phone_number: string;
  added_at: string;
}

export interface PodAttendanceRow {
  membership_id: string;
  user_id: string;
  ticket_id: string | null;
  ticket_code: string;
  name: string;
  avatar_url: string;
  email: string;
  phone_extension: string;
  phone_number: string;
  seats: number;
  attended: boolean;
  attended_at: string | null;
  marked_method: AttendanceMarkMethod | null;
  marked_by_name: string;
  verified_phone: string;
  companions: PodAttendanceCompanion[];
  companions_required: number;
}

export interface PodAttendanceClubAdmin {
  id: string;
  name: string;
  avatar_url: string;
  email: string;
  phone: string;
  whatsapp: string;
}

export interface PodAttendanceBoard {
  pod_id: string;
  pod_title: string;
  pod_date_time: string | null;
  pod_end_date_time: string | null;
  viewer: PodAttendanceViewer;
  lock: PodAttendanceLock;
  can_mark: boolean;
  otp_required: boolean;
  marked_count: number;
  total_count: number;
  marked_seats: number;
  total_seats: number;
  rows: PodAttendanceRow[];
  club_admins: PodAttendanceClubAdmin[];
}

/**
 * What one row can do right now.
 *
 * A single value rather than three booleans in the view, because the three
 * states are mutually exclusive and the two surfaces used to disagree about
 * which one wins when a multi-seat booking was also already marked.
 */
export type AttendanceRowState =
  /** Already present — the green row. */
  | 'MARKED'
  /** Markable: press the button (and prove the number first, if required). */
  | 'READY'
  /** Blocked until the rest of the group is named at the door. */
  | 'NEEDS_COMPANIONS'
  /** The roster is closed; nothing on this row can change. */
  | 'LOCKED';

export function attendanceRowState(
  row: Readonly<Pick<PodAttendanceRow, 'attended' | 'companions_required'>>,
  canMark: boolean
): AttendanceRowState {
  if (row.attended) return 'MARKED';
  if (!canMark) return 'LOCKED';
  if (row.companions_required > 0) return 'NEEDS_COMPANIONS';
  return 'READY';
}

/** Marked and not-marked, in the order the page shows them. */
export function splitAttendance(rows: readonly PodAttendanceRow[]): {
  marked: PodAttendanceRow[];
  unmarked: PodAttendanceRow[];
} {
  const marked: PodAttendanceRow[] = [];
  const unmarked: PodAttendanceRow[] = [];
  for (const row of rows) {
    if (row.attended) marked.push(row);
    else unmarked.push(row);
  }
  return { marked, unmarked };
}

/** 0-100, for the progress bar. 0 rather than NaN when nobody booked. */
export function attendanceProgress(
  board: Readonly<Pick<PodAttendanceBoard, 'marked_seats' | 'total_seats'>>
): number {
  if (board.total_seats <= 0) return 0;
  return Math.min(100, Math.round((board.marked_seats / board.total_seats) * 100));
}

/** True while somebody on the roster still has no mark against them. */
export const hasUnmarked = (
  board: Readonly<Pick<PodAttendanceBoard, 'marked_count' | 'total_count'>>
): boolean => board.marked_count < board.total_count;

/**
 * Whether the host has to prove the attendee's number before marking them.
 *
 * The Club Admin's override answers false whatever the setting says — its whole
 * purpose is to work when the attendee cannot be reached, so asking it to reach
 * them would be circular. The server enforces the same rule; this is only so
 * the UI does not offer a step the mutation would then reject.
 */
export const needsOtp = (
  board: Readonly<Pick<PodAttendanceBoard, 'viewer' | 'otp_required'>>
): boolean => board.viewer === 'HOST' && board.otp_required;

/**
 * The three shapes the verify-the-attendee form checks.
 *
 * These restate `@duncit/regex`'s OTP_6, PHONE_INTL and DIAL_CODE rather than
 * importing them, because `@duncit/utils` is deliberately ZERO-dependency — it
 * is one of the few packages the native app can consume, and every runtime dep
 * added here has to be mirrored into both mobile Dockerfiles and into all
 * seventeen portal ones. Keep them identical to that package; the server
 * re-checks all three anyway, so a client that drifted would only be wrong
 * about when the button lights up, never about what is accepted.
 */
export const isOtpCodeShape = (value: string): boolean => /^\d{6}$/.test(value.trim());
export const isOtpPhoneShape = (value: string): boolean => /^\d{6,15}$/.test(value.trim());
export const isOtpExtensionShape = (value: string): boolean => /^\+?\d{1,5}$/.test(value.trim());

/** `+91 9876543210`, or '' when there is no number to show. */
export function joinPhone(extension: string, number: string): string {
  const digits = String(number ?? '').trim();
  if (!digits) return '';
  const ext = String(extension ?? '').trim();
  return ext ? `${ext} ${digits}` : digits;
}
