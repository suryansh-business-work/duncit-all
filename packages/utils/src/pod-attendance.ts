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

/** How a booking came to be marked present. Mirrors `AttendanceMarkMethod`.
 * VIRTUAL_JOIN is a virtual pod's door: a joined member opening the meeting
 * link from the pod page, inside the pod window. */
export type AttendanceMarkMethod =
  | 'HOST_SCAN'
  | 'HOST_MANUAL'
  | 'CLUB_ADMIN_FORCE'
  | 'ADMIN'
  | 'VIRTUAL_JOIN';

/** The two kinds of pod. Mirrors the server's `PodMode`. */
export type PodAttendanceMode = 'PHYSICAL' | 'VIRTUAL';

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
  /** A virtual pod has no door to scan at — the scanner is hidden and the
   * earnings note says how attendance is recorded instead. */
  pod_mode: PodAttendanceMode;
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
 * Whether the host has a door to scan at.
 *
 * Only a physical pod does; a virtual pod's attendance is recorded when a
 * member opens the meeting link, so offering the scanner there is an
 * invitation to a step that cannot happen. Decided here so the MUI and the
 * Tamagui screens cannot disagree about it (rule 27).
 */
export const canScanTickets = (
  board: Readonly<Pick<PodAttendanceBoard, 'viewer' | 'can_mark' | 'pod_mode'>>
): boolean => board.viewer === 'HOST' && board.can_mark && board.pod_mode !== 'VIRTUAL';

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

/**
 * The dial code a phone field starts on.
 *
 * One definition rather than a literal per form: it is prefilled so the common
 * case is "confirm", not "type", and it stays editable everywhere it appears.
 */
export const DEFAULT_DIAL_CODE = '+91';

/**
 * One of the extra people a multi-seat booking admits, as the door's form
 * holds them.
 *
 * The same shape in MUI and in Tamagui (rule 27), including the challenge id —
 * the host verifies the number on the row, and the id is what carries that
 * proof into the scan that records the group.
 */
export interface CompanionEntry {
  name: string;
  phone_extension: string;
  phone_number: string;
  /** A verified POD_COMPANION challenge, '' until the host proves this number. */
  otp_challenge_id: string;
}

/** `count` empty rows, ready to be filled in at the door. */
export const blankCompanionEntries = (count: number): CompanionEntry[] =>
  Array.from({ length: Math.max(count, 0) }, () => ({
    name: '',
    phone_extension: DEFAULT_DIAL_CODE,
    phone_number: '',
    otp_challenge_id: '',
  }));

/** Everything the server needs before this row can be recorded. */
export const isCompanionEntryComplete = (entry: Readonly<CompanionEntry>): boolean =>
  entry.name.trim().length >= 2 &&
  isOtpExtensionShape(entry.phone_extension) &&
  isOtpPhoneShape(entry.phone_number);

/** True once every row can be recorded. The code is never part of this — a
 * number that cannot be reached must not hold the group at the door. */
export const areCompanionEntriesComplete = (
  entries: readonly CompanionEntry[]
): boolean => entries.length > 0 && entries.every(isCompanionEntryComplete);

/** One companion as `PodCompanionInput` carries them to the server. */
export interface CompanionRecordInput {
  name: string;
  phone_extension: string;
  phone_number: string;
  /** null when the host never proved this number — an option, not a gate. */
  otp_challenge_id: string | null;
}

/**
 * The rows, as the scan that records them sends them.
 *
 * Shared rather than written twice: the MUI form and the Tamagui one collect
 * the same people for the same mutation, and a trim done on one side only is
 * exactly how the two would start disagreeing about what was recorded.
 */
export const companionEntriesToInput = (
  entries: readonly CompanionEntry[]
): CompanionRecordInput[] =>
  entries.map((entry) => ({
    name: entry.name.trim(),
    phone_extension: entry.phone_extension.trim(),
    phone_number: entry.phone_number.trim(),
    otp_challenge_id: entry.otp_challenge_id || null,
  }));

/** What one row's verify control is doing right now. */
export type CompanionOtpState =
  /** This number already answered a code. */
  | 'VERIFIED'
  /** Somebody else's code is in flight — the host proves them one at a time. */
  | 'BLOCKED'
  /** No number to send to yet. */
  | 'INCOMPLETE'
  /** Ready to send. */
  | 'READY';

/**
 * Whether this row may start a verification.
 *
 * One at a time is the whole point: a code proves the person standing in front
 * of the host, and two live challenges at a door is how the wrong person gets
 * ticked. `activeIndex` is the row with a challenge open, or null when none is.
 */
export function companionOtpState(
  entry: Readonly<CompanionEntry>,
  index: number,
  activeIndex: number | null
): CompanionOtpState {
  if (entry.otp_challenge_id) return 'VERIFIED';
  if (activeIndex !== null && activeIndex !== index) return 'BLOCKED';
  if (!isCompanionEntryComplete(entry)) return 'INCOMPLETE';
  return 'READY';
}

/** `+91 9876543210`, or '' when there is no number to show. */
export function joinPhone(extension: string, number: string): string {
  const digits = String(number ?? '').trim();
  if (!digits) return '';
  const ext = String(extension ?? '').trim();
  return ext ? `${ext} ${digits}` : digits;
}
