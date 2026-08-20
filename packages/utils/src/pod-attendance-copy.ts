import type { AttendanceMarkMethod, PodAttendanceLock } from './pod-attendance';

/**
 * Every word the attendance surfaces render, assembled from the calling
 * surface's own translator.
 *
 * Each key is written out as a literal `t('…')` rather than built from a
 * namespace + a suffix, because `scripts/verify-translation-keys.mjs` greps
 * source for the literal string — a composed key is reported as
 * shipped-but-never-rendered and fails the Shared Gates job. Same shape (and
 * same reason) as `@duncit/host-pod-actions`' buildHostPodActionLabels.
 *
 * mWeb and the native app share `mweb.*`; every MUI portal shares `shell.*`.
 * The server stores one row per key path, so the two namespaces cannot collapse
 * into one — the values are kept word-for-word identical instead.
 */
export type AttendanceTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface PodAttendanceLabels {
  pageTitle: string;
  menuItem: string;
  summary: (marked: number, total: number) => string;
  seatsSummary: (marked: number, total: number) => string;
  markedHeading: string;
  unmarkedHeading: string;
  emptyRoster: string;
  allMarked: string;
  /** Per-row. */
  markButton: string;
  marking: string;
  markedChip: string;
  notMarkedChip: string;
  seats: (count: number) => string;
  companionsNeeded: (count: number) => string;
  markedBy: (name: string) => string;
  markedAt: (when: string) => string;
  verifiedPhone: (phone: string) => string;
  methodLabel: (method: AttendanceMarkMethod) => string;
  /** The bottom call to action. */
  scanCta: string;
  /** Why any of this matters. */
  earningsTitle: string;
  earningsBody: string;
  /** The roster is closed. */
  lockedTitle: (lock: PodAttendanceLock) => string;
  lockedBody: (lock: PodAttendanceLock) => string;
  clubAdminTitle: string;
  clubAdminBody: string;
  clubAdminNone: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  retry: string;
  back: string;
  /** OTP. */
  otpTitle: string;
  otpBody: (name: string) => string;
  otpName: string;
  otpExtension: string;
  otpPhone: string;
  otpMediumLabel: string;
  otpMediumWhatsapp: string;
  otpMediumSms: string;
  otpMediumRequired: string;
  otpNameRequired: string;
  otpExtensionInvalid: string;
  otpPhoneInvalid: string;
  otpSend: string;
  otpSending: string;
  otpResend: string;
  otpCode: string;
  otpCodeInvalid: string;
  otpVerify: string;
  otpVerifying: string;
  otpVerified: string;
  otpTestCode: (code: string) => string;
  otpCancel: string;
  /** Club Admin force mark. */
  forceTitle: string;
  forceWarning: string;
  forceConfirm: string;
  forceCancel: string;
}

/** `mweb.*` — mWeb and the native app (rule 27: one namespace for both). */
export function mwebAttendanceLabels(t: AttendanceTranslate): PodAttendanceLabels {
  return {
    pageTitle: t('mweb.attendance.pageTitle'),
    menuItem: t('mweb.attendance.menuItem'),
    summary: (marked, total) =>
      t('mweb.attendance.summary', { vars: { marked, total } }),
    seatsSummary: (marked, total) =>
      t('mweb.attendance.seatsSummary', { vars: { marked, total } }),
    markedHeading: t('mweb.attendance.markedHeading'),
    unmarkedHeading: t('mweb.attendance.unmarkedHeading'),
    emptyRoster: t('mweb.attendance.emptyRoster'),
    allMarked: t('mweb.attendance.allMarked'),
    markButton: t('mweb.attendance.markButton'),
    marking: t('mweb.attendance.marking'),
    markedChip: t('mweb.attendance.markedChip'),
    notMarkedChip: t('mweb.attendance.notMarkedChip'),
    seats: (count) => t('mweb.attendance.seats', { vars: { count } }),
    companionsNeeded: (count) =>
      t('mweb.attendance.companionsNeeded', { vars: { count } }),
    markedBy: (name) => t('mweb.attendance.markedBy', { vars: { name } }),
    markedAt: (when) => t('mweb.attendance.markedAt', { vars: { when } }),
    verifiedPhone: (phone) => t('mweb.attendance.verifiedPhone', { vars: { phone } }),
    methodLabel: (method) => mwebMethodLabel(t, method),
    scanCta: t('mweb.attendance.scanCta'),
    earningsTitle: t('mweb.attendance.earningsTitle'),
    earningsBody: t('mweb.attendance.earningsBody'),
    lockedTitle: (lock) => mwebLockedTitle(t, lock),
    lockedBody: (lock) => mwebLockedBody(t, lock),
    clubAdminTitle: t('mweb.attendance.clubAdminTitle'),
    clubAdminBody: t('mweb.attendance.clubAdminBody'),
    clubAdminNone: t('mweb.attendance.clubAdminNone'),
    contactEmail: t('mweb.attendance.contactEmail'),
    contactPhone: t('mweb.attendance.contactPhone'),
    contactWhatsapp: t('mweb.attendance.contactWhatsapp'),
    retry: t('mweb.attendance.retry'),
    back: t('mweb.attendance.back'),
    otpTitle: t('mweb.attendance.otpTitle'),
    otpBody: (name) => t('mweb.attendance.otpBody', { vars: { name } }),
    otpName: t('mweb.attendance.otpName'),
    otpExtension: t('mweb.attendance.otpExtension'),
    otpPhone: t('mweb.attendance.otpPhone'),
    otpMediumLabel: t('mweb.attendance.otpMediumLabel'),
    otpMediumWhatsapp: t('mweb.attendance.otpMediumWhatsapp'),
    otpMediumSms: t('mweb.attendance.otpMediumSms'),
    otpMediumRequired: t('mweb.attendance.otpMediumRequired'),
    otpNameRequired: t('mweb.attendance.otpNameRequired'),
    otpExtensionInvalid: t('mweb.attendance.otpExtensionInvalid'),
    otpPhoneInvalid: t('mweb.attendance.otpPhoneInvalid'),
    otpSend: t('mweb.attendance.otpSend'),
    otpSending: t('mweb.attendance.otpSending'),
    otpResend: t('mweb.attendance.otpResend'),
    otpCode: t('mweb.attendance.otpCode'),
    otpCodeInvalid: t('mweb.attendance.otpCodeInvalid'),
    otpVerify: t('mweb.attendance.otpVerify'),
    otpVerifying: t('mweb.attendance.otpVerifying'),
    otpVerified: t('mweb.attendance.otpVerified'),
    otpTestCode: (code) => t('mweb.attendance.otpTestCode', { vars: { code } }),
    otpCancel: t('mweb.attendance.otpCancel'),
    forceTitle: t('mweb.attendance.forceTitle'),
    forceWarning: t('mweb.attendance.forceWarning'),
    forceConfirm: t('mweb.attendance.forceConfirm'),
    forceCancel: t('mweb.attendance.forceCancel'),
  };
}

/** Hoisted out of the builder so the branches sit at nesting 0 (Sonar S3358). */
function mwebMethodLabel(t: AttendanceTranslate, method: AttendanceMarkMethod): string {
  if (method === 'HOST_SCAN') return t('mweb.attendance.methodScan');
  if (method === 'HOST_MANUAL') return t('mweb.attendance.methodManual');
  if (method === 'CLUB_ADMIN_FORCE') return t('mweb.attendance.methodClubAdmin');
  return t('mweb.attendance.methodAdmin');
}

function mwebLockedTitle(t: AttendanceTranslate, lock: PodAttendanceLock): string {
  if (lock === 'CANCELLED') return t('mweb.attendance.lockedCancelledTitle');
  return t('mweb.attendance.lockedCompletedTitle');
}

function mwebLockedBody(t: AttendanceTranslate, lock: PodAttendanceLock): string {
  if (lock === 'CANCELLED') return t('mweb.attendance.lockedCancelledBody');
  return t('mweb.attendance.lockedCompletedBody');
}

/** `shell.*` — every MUI portal. Word-for-word identical to `mweb.*` above. */
export function shellAttendanceLabels(t: AttendanceTranslate): PodAttendanceLabels {
  return {
    pageTitle: t('shell.attendance.pageTitle'),
    menuItem: t('shell.attendance.menuItem'),
    summary: (marked, total) =>
      t('shell.attendance.summary', { vars: { marked, total } }),
    seatsSummary: (marked, total) =>
      t('shell.attendance.seatsSummary', { vars: { marked, total } }),
    markedHeading: t('shell.attendance.markedHeading'),
    unmarkedHeading: t('shell.attendance.unmarkedHeading'),
    emptyRoster: t('shell.attendance.emptyRoster'),
    allMarked: t('shell.attendance.allMarked'),
    markButton: t('shell.attendance.markButton'),
    marking: t('shell.attendance.marking'),
    markedChip: t('shell.attendance.markedChip'),
    notMarkedChip: t('shell.attendance.notMarkedChip'),
    seats: (count) => t('shell.attendance.seats', { vars: { count } }),
    companionsNeeded: (count) =>
      t('shell.attendance.companionsNeeded', { vars: { count } }),
    markedBy: (name) => t('shell.attendance.markedBy', { vars: { name } }),
    markedAt: (when) => t('shell.attendance.markedAt', { vars: { when } }),
    verifiedPhone: (phone) => t('shell.attendance.verifiedPhone', { vars: { phone } }),
    methodLabel: (method) => shellMethodLabel(t, method),
    scanCta: t('shell.attendance.scanCta'),
    earningsTitle: t('shell.attendance.earningsTitle'),
    earningsBody: t('shell.attendance.earningsBody'),
    lockedTitle: (lock) => shellLockedTitle(t, lock),
    lockedBody: (lock) => shellLockedBody(t, lock),
    clubAdminTitle: t('shell.attendance.clubAdminTitle'),
    clubAdminBody: t('shell.attendance.clubAdminBody'),
    clubAdminNone: t('shell.attendance.clubAdminNone'),
    contactEmail: t('shell.attendance.contactEmail'),
    contactPhone: t('shell.attendance.contactPhone'),
    contactWhatsapp: t('shell.attendance.contactWhatsapp'),
    retry: t('shell.attendance.retry'),
    back: t('shell.attendance.back'),
    otpTitle: t('shell.attendance.otpTitle'),
    otpBody: (name) => t('shell.attendance.otpBody', { vars: { name } }),
    otpName: t('shell.attendance.otpName'),
    otpExtension: t('shell.attendance.otpExtension'),
    otpPhone: t('shell.attendance.otpPhone'),
    otpMediumLabel: t('shell.attendance.otpMediumLabel'),
    otpMediumWhatsapp: t('shell.attendance.otpMediumWhatsapp'),
    otpMediumSms: t('shell.attendance.otpMediumSms'),
    otpMediumRequired: t('shell.attendance.otpMediumRequired'),
    otpNameRequired: t('shell.attendance.otpNameRequired'),
    otpExtensionInvalid: t('shell.attendance.otpExtensionInvalid'),
    otpPhoneInvalid: t('shell.attendance.otpPhoneInvalid'),
    otpSend: t('shell.attendance.otpSend'),
    otpSending: t('shell.attendance.otpSending'),
    otpResend: t('shell.attendance.otpResend'),
    otpCode: t('shell.attendance.otpCode'),
    otpCodeInvalid: t('shell.attendance.otpCodeInvalid'),
    otpVerify: t('shell.attendance.otpVerify'),
    otpVerifying: t('shell.attendance.otpVerifying'),
    otpVerified: t('shell.attendance.otpVerified'),
    otpTestCode: (code) => t('shell.attendance.otpTestCode', { vars: { code } }),
    otpCancel: t('shell.attendance.otpCancel'),
    forceTitle: t('shell.attendance.forceTitle'),
    forceWarning: t('shell.attendance.forceWarning'),
    forceConfirm: t('shell.attendance.forceConfirm'),
    forceCancel: t('shell.attendance.forceCancel'),
  };
}

function shellMethodLabel(t: AttendanceTranslate, method: AttendanceMarkMethod): string {
  if (method === 'HOST_SCAN') return t('shell.attendance.methodScan');
  if (method === 'HOST_MANUAL') return t('shell.attendance.methodManual');
  if (method === 'CLUB_ADMIN_FORCE') return t('shell.attendance.methodClubAdmin');
  return t('shell.attendance.methodAdmin');
}

function shellLockedTitle(t: AttendanceTranslate, lock: PodAttendanceLock): string {
  if (lock === 'CANCELLED') return t('shell.attendance.lockedCancelledTitle');
  return t('shell.attendance.lockedCompletedTitle');
}

function shellLockedBody(t: AttendanceTranslate, lock: PodAttendanceLock): string {
  if (lock === 'CANCELLED') return t('shell.attendance.lockedCancelledBody');
  return t('shell.attendance.lockedCompletedBody');
}

/** Pick the namespace the calling surface ships. */
export function buildAttendanceLabels(
  t: AttendanceTranslate,
  namespace: 'mweb' | 'shell',
): PodAttendanceLabels {
  return namespace === 'mweb' ? mwebAttendanceLabels(t) : shellAttendanceLabels(t);
}
