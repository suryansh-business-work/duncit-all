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

/**
 * Why the roster is read-only, or OPEN when it is not.
 *
 * EXPIRED is the host's completion window running out (Admin > Pods > Pod
 * Settings): the pod was never completed, so the payout was never priced, and
 * attendance written weeks after the door is not a record anybody can be paid
 * on. It shuts the HOST's side only — the Club Admin's override is exactly the
 * path an abandoned roster still needs.
 */
export type PodAttendanceLock = 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

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
  /** Whether THIS viewer may still write to the roster — the server decides it,
   * because an EXPIRED board is shut to the host and open to the Club Admin. */
  can_mark: boolean;
  /** When the host's window to complete this pod runs out (ISO), or null when
   * the pod has no usable start. */
  complete_deadline: string | null;
  /** How long that window is, in hours — the number the copy quotes. */
  complete_timeout_hours: number;
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

/**
 * The companion gate is the HOST's, and only the host's.
 *
 * A multi-seat booking is a bare number until someone writes down who it
 * covers, and the one moment those people are all present is the host's door —
 * so the host's row waits. A Club Admin is never at that door: they are
 * correcting a roster afterwards, their mutation has no companion gate, and
 * their dialog collects whatever names they were read. Applying the host's
 * wait to them disabled the only button they have, on exactly the bookings
 * they are called about.
 */
export function attendanceRowState(
  row: Readonly<Pick<PodAttendanceRow, 'attended' | 'companions_required'>>,
  canMark: boolean,
  viewer: PodAttendanceViewer = 'HOST'
): AttendanceRowState {
  if (row.attended) return 'MARKED';
  if (!canMark) return 'LOCKED';
  if (viewer === 'HOST' && row.companions_required > 0) return 'NEEDS_COMPANIONS';
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
 * Whether the page states the completion deadline.
 *
 * Only to the HOST, and only while there is still a deadline to beat: it is
 * the host's window, and it is the one thing on this page they can still lose
 * money by ignoring. A Club Admin reading the same board is not racing it, and
 * once it has passed the EXPIRED notice says so in past tense instead.
 *
 * Shared rather than restated per surface so the MUI page and the Tamagui
 * screen cannot disagree about when the warning appears (rule 27).
 */
export const showsCompleteDeadline = (
  board: Readonly<Pick<PodAttendanceBoard, 'viewer' | 'lock' | 'complete_deadline'>>
): boolean => board.viewer === 'HOST' && board.lock === 'OPEN' && !!board.complete_deadline;

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
 * The shortest number worth sending a one-time code to.
 *
 * `isOtpPhoneShape` accepts six digits because that is what the record stores
 * and what a landline abroad legitimately is. Offering to send a WhatsApp code
 * is a different question: at six digits the host is still halfway through
 * typing a mobile number, so the button lit up on a number nobody holds and
 * spent a code proving it. The door waits for the whole number.
 */
export const OTP_PHONE_MIN_DIGITS = 10;

/** True once the number is long enough to be worth a code (see the constant). */
export const isVerifiablePhoneShape = (value: string): boolean =>
  /^\d{10,15}$/.test(value.trim());

/**
 * The comparable form of a phone number.
 *
 * Digits only and, past ten of them, only the last ten: the same phone reaches
 * the door written `+91 98765 43210`, `919876543210` and `9876543210`, and a
 * check that reads those as three different people is not a check. Shorter
 * numbers are compared whole. The pieces are taken separately so a split
 * extension/number pair and an already-joined line key the same way.
 */
export const phoneKey = (...parts: readonly string[]): string => {
  const digits = (parts.join('').match(/\d+/g) ?? []).join('');
  return digits.length > OTP_PHONE_MIN_DIGITS ? digits.slice(-OTP_PHONE_MIN_DIGITS) : digits;
};

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

/**
 * One name on a Club Admin's mark, as `PodForcedCompanionInput` carries it.
 *
 * No `otp_challenge_id`, unlike `CompanionRecordInput`: a companion proved by
 * code belongs to the host's door, and the input type this feeds does not
 * declare the field at all — sending it would be rejected before the server
 * saw the names.
 */
export interface NamedCompanionInput {
  name: string;
  phone_extension: string;
  phone_number: string;
}

/**
 * The names a Club Admin was read, as their mark sends them.
 *
 * Blanks are dropped rather than rejected: the admin records the names they
 * were actually given, and holding the mark for the ones they were not is the
 * same dead end the host's door gate already was for them. A number stays
 * optional for the same reason — chasing one means ringing the attendee, which
 * is the call this whole path exists to avoid.
 */
export const namedCompanionEntries = (
  // The name/number half of a CompanionEntry, so the door's own form can be
  // passed straight in and an admin's form need not carry a challenge id it
  // never fills.
  entries: readonly Readonly<Omit<CompanionEntry, 'otp_challenge_id'>>[]
): NamedCompanionInput[] =>
  entries
    .filter((entry) => entry.name.trim().length >= 2)
    .map((entry) => ({
      name: entry.name.trim(),
      // A dial code with no number behind it is noise on the record.
      phone_extension: entry.phone_number.trim() ? entry.phone_extension.trim() : '',
      phone_number: entry.phone_number.trim(),
    }));

/**
 * What one row compares by — '' until the host has actually typed a number.
 *
 * Keying the whole row would read the PREFILLED DIAL CODE as a phone number:
 * every blank row on a fresh multi-seat ticket carries `DEFAULT_DIAL_CODE`, so
 * `phoneKey('+91', '')` is `'91'` and every row after the first would be
 * reported as a repeat of it before anybody typed anything.
 */
const entryPhoneKey = (entry: Readonly<CompanionEntry>): string =>
  entry.phone_number.trim() ? phoneKey(entry.phone_extension, entry.phone_number) : '';

/**
 * The rows whose number somebody else already has.
 *
 * One number is one person. A ticket that admits eight admits eight people, so
 * the same WhatsApp number cannot stand for two of them — nor for the buyer,
 * whose own number is already on the booking. `reserved` carries those: the
 * buyer's phone and WhatsApp, plus anyone already recorded against the ticket.
 *
 * A row that has already been PROVED keeps its number whatever order the form
 * was filled in; among the rest the first to use a number keeps it, so the row
 * asked to change is the one that repeated it.
 */
export function duplicateCompanionIndexes(
  entries: readonly CompanionEntry[],
  reserved: readonly string[]
): Set<number> {
  const taken = new Set<string>();
  for (const line of reserved) {
    const key = phoneKey(line);
    if (key) taken.add(key);
  }
  for (const entry of entries) {
    if (entry.otp_challenge_id) taken.add(entryPhoneKey(entry));
  }

  const repeats = new Set<number>();
  entries.forEach((entry, index) => {
    if (entry.otp_challenge_id) return;
    const key = entryPhoneKey(entry);
    if (!key) return;
    if (taken.has(key)) repeats.add(index);
    else taken.add(key);
  });
  return repeats;
}

/** What one row's verify control is doing right now. */
export type CompanionOtpState =
  /** This number already answered a code. */
  | 'VERIFIED'
  /** Somebody else's code is in flight — the host proves them one at a time. */
  | 'BLOCKED'
  /** Somebody on this ticket already has this number. */
  | 'DUPLICATE'
  /** No whole number to send to yet. */
  | 'INCOMPLETE'
  /** Ready to send. */
  | 'READY';

/**
 * Whether this row may start a verification.
 *
 * One at a time is the whole point: a code proves the person standing in front
 * of the host, and two live challenges at a door is how the wrong person gets
 * ticked. `activeIndex` is the row with a challenge open, or null when none is.
 *
 * `duplicate` comes from `duplicateCompanionIndexes` — a number already spoken
 * for on this ticket proves nobody new, and sending it a code would tick a
 * second seat off the back of one person answering once.
 *
 * INCOMPLETE covers the half-typed number too: the row is only ready at
 * `OTP_PHONE_MIN_DIGITS`, so the button no longer lights up six digits into a
 * mobile number.
 */
export function companionOtpState(
  entry: Readonly<CompanionEntry>,
  index: number,
  activeIndex: number | null,
  duplicate: boolean
): CompanionOtpState {
  if (entry.otp_challenge_id) return 'VERIFIED';
  if (activeIndex !== null && activeIndex !== index) return 'BLOCKED';
  if (duplicate) return 'DUPLICATE';
  if (!isCompanionEntryComplete(entry) || !isVerifiablePhoneShape(entry.phone_number)) {
    return 'INCOMPLETE';
  }
  return 'READY';
}

/** `+91 9876543210`, or '' when there is no number to show. */
export function joinPhone(extension: string, number: string): string {
  const digits = String(number ?? '').trim();
  if (!digits) return '';
  const ext = String(extension ?? '').trim();
  return ext ? `${ext} ${digits}` : digits;
}
