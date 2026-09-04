/**
 * The copy these dialogs render, assembled from the calling surface's
 * translator.
 *
 * Every key is written out as a literal `t('…')` call rather than built from a
 * namespace + suffix — `scripts/verify-translation-keys.mjs` greps source for
 * the literal key, so a computed one is reported as shipped-but-never-rendered
 * and fails the Shared Gates job. Same reasoning (and same shape) as
 * `@duncit/slots`' buildSlotLabels.
 *
 * mWeb and the native app share `mweb.*`; every MUI portal shares `shell.*`.
 * The server stores one row per key path, so the two namespaces cannot collapse
 * into one — the values are kept word-for-word identical instead.
 */

import { mwebSpotsLabels, shellSpotsLabels, type SpotsStepperLabels } from '@duncit/ui';

export type HostPodTranslate = (
  key: string,
  options?: { count?: number; vars?: Record<string, string | number> },
) => string;

export interface HostPodActionLabels {
  /** "Pod Club Admin" — only rendered when the surface passes `onClubAdmin`. */
  clubAdmin: string;
  /**
   * "See Marked Attendance" — only rendered when the surface passes
   * `onSeeAttendance`. It opens a PAGE rather than a dialog, so the surface
   * owns the navigation and a console without that route simply omits it.
   */
  seeAttendance: string;
  /**
   * "Slot Request Status" — only rendered when the surface passes
   * `onSlotRequest`. Like `seeAttendance` it opens a PAGE, so a console without
   * that route simply omits the item.
   */
  slotRequest: string;
  /** The completion dialog's single scanner button, under the roster. */
  attendanceScanCta: string;
  /** The rating link in the pod's action menu. */
  feedbackLink: string;
  shareLink: string;
  copyLink: string;
  linkCopied: string;
  copyFailed: string;
  shareMessage: (title: string) => string;
  /** Ticket scanning at the door. */
  personOnTicket: string;
  peopleOnTicket: string;
  companionsTitle: string;
  companionsBody: (seats: number, count: number) => string;
  companionName: string;
  companionPhone: string;
  /**
   * Proving one companion's own number at the door, one person at a time.
   *
   * The GENERIC half of this copy (send, resend, the code box, the test code)
   * is the attendance page's, word for word, so it is read from that namespace
   * rather than shipped a second time under this one (rule 34).
   */
  companionExtension: string;
  companionVerifyCta: string;
  companionOtpHint: string;
  /** Why the code button is dead: no name, or not a whole number yet. */
  companionOtpIncomplete: string;
  /** Why the code button is dead: somebody on this ticket has this number. */
  companionOtpDuplicate: string;
  companionVerified: string;
  /** Under a proved row, saying why its number can no longer be typed in. */
  companionLocked: string;
  companionOtpBlocked: string;
  companionOtpFailed: string;
  otpSend: string;
  otpSending: string;
  otpResend: string;
  otpCode: string;
  otpCodeInvalid: string;
  otpVerify: string;
  otpVerifying: string;
  otpCancel: string;
  otpExtensionInvalid: string;
  otpTestCode: (code: string) => string;
  companionsSubmit: string;
  companionsIncomplete: string;
  companionsHeading: (index: number) => string;
  fieldRequired: string;
  nameInvalid: string;
  phoneInvalid: string;
  attendanceMarked: string;
  attendanceMarkedOne: (name: string) => string;
  attendanceMarkedGroup: (name: string, count: number) => string;
  alreadyMarked: string;
  /** The buyer's chip while the group's details are still being collected. */
  notMarkedYet: string;
  /** Heading for the green-tick roster of everyone this ticket let in. */
  checkedInList: string;
  confirmDone: string;
  /** Heads the list of guideline rules an edit broke. */
  contentCheck: string;
  /** The total-spots control in the edit dialog — @duncit/ui's own words. */
  spots: SpotsStepperLabels;
  /** Under the control when a booked space caps the pod. */
  spotsVenueHint: (capacity: number, taken: number) => string;
  /** Under the control when nothing but the activity's floor caps the pod. */
  spotsFreeHint: (min: number, taken: number) => string;
  /** Why the control will not go below where it starts, for a host. */
  spotsIncreaseOnly: string;
  /** The pod-row menu and the dialogs it opens. */
  menuTooltip: string;
  scanTickets: string;
  completePod: string;
  editPod: string;
  cancelPod: string;
  close: string;
  cancel: string;
  saving: string;
  saveChanges: string;
  fieldTitle: string;
  fieldDescription: string;
  fieldMedia: string;
  titleTooShort: string;
  titleTooLong: string;
  descriptionTooShort: string;
  imageRequired: string;
  resubmitTitle: string;
  resubmitHint: string;
  resubmitting: string;
  resubmitCta: string;
  venue: string;
  venueHint: string;
  completeHint: string;
  venueBillAmount: string;
  venueBillRequired: string;
  /**
   * The settlement waterfall in the HOST's voice. `@duncit/ui` writes the same
   * numbers for staff — "Host receives", the venue commission spelled out —
   * which is the right voice in a console and the wrong one on the screen where
   * a host is completing their own pod.
   */
  sharePreviewHint: string;
  sharePaid: string;
  shareGst: (pct: number) => string;
  sharePlatformFee: (pct: number) => string;
  sharePool: string;
  shareVenueSlot: string;
  shareVenueReceives: string;
  shareYouReceive: string;
  shareDuncitRevenue: string;
  /** The completion window closed before this pod was settled. No date in it:
   * this package has no admin-formatted clock, and the attendance page — which
   * does — is where the exact deadline is quoted. */
  shareExpired: string;
  podMedia: string;
  completing: string;
  cancelNoOthers: string;
  cancelEmailOnly: string;
  reason: string;
  reasonRequired: string;
  /** Display wording for one stored reason value. */
  cancelReason: (value: string) => string;
  note: string;
  noteHint: string;
  noteTooLong: string;
  noteRequired: string;
  keepPod: string;
  cancelling: string;
  initiateRefunds: string;
  pasteTicketCode: string;
  scanFrameHint: string;
  checkCode: string;
  /** aria-label naming the pod the menu belongs to. */
  menuAria: (title: string) => string;
  cancelIntro: (title: string) => string;
  cancelOthers: (count: number) => string;
  cancelRefund: (amount: string, count: number) => string;
}

/**
 * The stored reason value -> its catalogue key.
 *
 * Written out per namespace rather than composed, because the key-verification
 * gate greps source for the literal key and a computed one reads as shipped but
 * never rendered.
 */
const MWEB_CANCEL_REASON_KEYS: Record<string, string> = {
  'Event cancelled': 'mweb.hostPodActions.cancelReasons.eventCancelled',
  'Venue unavailable': 'mweb.hostPodActions.cancelReasons.venueUnavailable',
  'Low attendance': 'mweb.hostPodActions.cancelReasons.lowAttendance',
  Rescheduling: 'mweb.hostPodActions.cancelReasons.rescheduling',
  Other: 'mweb.hostPodActions.cancelReasons.other',
};

const SHELL_CANCEL_REASON_KEYS: Record<string, string> = {
  'Event cancelled': 'shell.hostPodActions.cancelReasons.eventCancelled',
  'Venue unavailable': 'shell.hostPodActions.cancelReasons.venueUnavailable',
  'Low attendance': 'shell.hostPodActions.cancelReasons.lowAttendance',
  Rescheduling: 'shell.hostPodActions.cancelReasons.rescheduling',
  Other: 'shell.hostPodActions.cancelReasons.other',
};

/** `mweb.*` — mWeb and the native app (rule 27: one namespace for both). */
export function mwebHostPodLabels(t: HostPodTranslate): HostPodActionLabels {
  return {
    clubAdmin: t('mweb.podClubAdmin.menuItem'),
    seeAttendance: t('mweb.attendance.menuItem'),
    slotRequest: t('mweb.podPending.menuItem'),
    attendanceScanCta: t('mweb.attendance.scanCta'),
    feedbackLink: t('mweb.podFeedback.feedbackLink'),
    shareLink: t('mweb.podFeedback.shareLink'),
    copyLink: t('mweb.podFeedback.copyLink'),
    linkCopied: t('mweb.podFeedback.linkCopied'),
    copyFailed: t('mweb.podFeedback.copyFailed'),
    shareMessage: (title) => t('mweb.podFeedback.shareMessage', { vars: { title } }),
    personOnTicket: t('mweb.hostScan.personOnTicket'),
    peopleOnTicket: t('mweb.hostScan.peopleOnTicket'),
    companionsTitle: t('mweb.hostScan.companionsTitle'),
    companionsBody: (seats, count) => t('mweb.hostScan.companionsBody', { vars: { seats, count } }),
    companionName: t('mweb.hostScan.companionName'),
    companionPhone: t('mweb.hostScan.companionPhone'),
    companionExtension: t('mweb.hostScan.companionExtension'),
    companionVerifyCta: t('mweb.hostScan.companionVerifyCta'),
    companionOtpHint: t('mweb.hostScan.companionOtpHint'),
    companionOtpIncomplete: t('mweb.hostScan.companionOtpIncomplete'),
    companionOtpDuplicate: t('mweb.hostScan.companionOtpDuplicate'),
    companionVerified: t('mweb.hostScan.companionVerified'),
    companionLocked: t('mweb.hostScan.companionLocked'),
    companionOtpBlocked: t('mweb.hostScan.companionOtpBlocked'),
    companionOtpFailed: t('mweb.hostScan.companionOtpFailed'),
    otpSend: t('mweb.attendance.otpSend'),
    otpSending: t('mweb.attendance.otpSending'),
    otpResend: t('mweb.attendance.otpResend'),
    otpCode: t('mweb.attendance.otpCode'),
    otpCodeInvalid: t('mweb.attendance.otpCodeInvalid'),
    otpVerify: t('mweb.attendance.otpVerify'),
    otpVerifying: t('mweb.attendance.otpVerifying'),
    otpCancel: t('mweb.attendance.otpCancel'),
    otpExtensionInvalid: t('mweb.attendance.otpExtensionInvalid'),
    otpTestCode: (code) => t('mweb.attendance.otpTestCode', { vars: { code } }),
    companionsSubmit: t('mweb.hostScan.companionsSubmit'),
    companionsIncomplete: t('mweb.hostScan.companionsIncomplete'),
    companionsHeading: (index) => t('mweb.hostScan.companionsHeading', { vars: { index } }),
    fieldRequired: t('mweb.hostScan.fieldRequired'),
    nameInvalid: t('mweb.hostScan.nameInvalid'),
    phoneInvalid: t('mweb.hostScan.phoneInvalid'),
    attendanceMarked: t('mweb.hostScan.attendanceMarked'),
    attendanceMarkedOne: (name) => t('mweb.hostScan.attendanceMarkedOne', { vars: { name } }),
    attendanceMarkedGroup: (name, count) =>
      t('mweb.hostScan.attendanceMarkedGroup', { vars: { name, count } }),
    alreadyMarked: t('mweb.hostScan.alreadyMarked'),
    notMarkedYet: t('mweb.hostScan.notMarkedYet'),
    checkedInList: t('mweb.hostScan.checkedInList'),
    confirmDone: t('mweb.hostScan.confirmDone'),
    contentCheck: t('mweb.hostPodEdit.contentCheck'),
    spots: mwebSpotsLabels(t),
    spotsVenueHint: (capacity, taken) =>
      t('mweb.hostPodEdit.spotsVenueHint', { vars: { capacity, taken } }),
    spotsFreeHint: (min, taken) => t('mweb.hostPodEdit.spotsFreeHint', { vars: { min, taken } }),
    spotsIncreaseOnly: t('mweb.hostPodEdit.spotsIncreaseOnly'),
    menuTooltip: t('mweb.hostPodActions.menuTooltip'),
    scanTickets: t('mweb.hostPodActions.scanTickets'),
    completePod: t('mweb.hostPodActions.completePod'),
    editPod: t('mweb.hostPodActions.editPod'),
    cancelPod: t('mweb.hostPodActions.cancelPod'),
    close: t('mweb.hostPodActions.close'),
    cancel: t('mweb.hostPodActions.cancel'),
    saving: t('mweb.hostPodActions.saving'),
    saveChanges: t('mweb.hostPodActions.saveChanges'),
    fieldTitle: t('mweb.hostPodActions.fieldTitle'),
    fieldDescription: t('mweb.hostPodActions.fieldDescription'),
    fieldMedia: t('mweb.hostPodActions.fieldMedia'),
    titleTooShort: t('mweb.hostPodActions.titleTooShort'),
    titleTooLong: t('mweb.hostPodActions.titleTooLong'),
    descriptionTooShort: t('mweb.hostPodActions.descriptionTooShort'),
    imageRequired: t('mweb.hostPodActions.imageRequired'),
    resubmitTitle: t('mweb.hostPodActions.resubmitTitle'),
    resubmitHint: t('mweb.hostPodActions.resubmitHint'),
    resubmitting: t('mweb.hostPodActions.resubmitting'),
    resubmitCta: t('mweb.hostPodActions.resubmitCta'),
    venue: t('mweb.hostPodActions.venue'),
    venueHint: t('mweb.hostPodActions.venueHint'),
    completeHint: t('mweb.hostPodActions.completeHint'),
    venueBillAmount: t('mweb.hostPodActions.venueBillAmount'),
    venueBillRequired: t('mweb.hostPodActions.venueBillRequired'),
    sharePreviewHint: t('mweb.hostShare.previewHint'),
    sharePaid: t('mweb.hostShare.customerPaid'),
    shareGst: (pct) => t('mweb.hostShare.gst', { vars: { pct } }),
    sharePlatformFee: (pct) => t('mweb.hostShare.platformFee', { vars: { pct } }),
    sharePool: t('mweb.hostShare.pool'),
    shareVenueSlot: t('mweb.hostShare.venueSlotPrice'),
    shareVenueReceives: t('mweb.hostShare.venueReceives'),
    shareYouReceive: t('mweb.hostShare.youReceive'),
    shareDuncitRevenue: t('mweb.hostShare.duncitRevenue'),
    shareExpired: t('mweb.hostShare.expired'),
    podMedia: t('mweb.hostPodActions.podMedia'),
    completing: t('mweb.hostPodActions.completing'),
    cancelNoOthers: t('mweb.hostPodActions.cancelNoOthers'),
    cancelEmailOnly: t('mweb.hostPodActions.cancelEmailOnly'),
    reason: t('mweb.hostPodActions.reason'),
    reasonRequired: t('mweb.hostPodActions.reasonRequired'),
    cancelReason: (value) => t(MWEB_CANCEL_REASON_KEYS[value] ?? 'mweb.hostPodActions.cancelReasons.other'),
    note: t('mweb.hostPodActions.note'),
    noteHint: t('mweb.hostPodActions.noteHint'),
    noteTooLong: t('mweb.hostPodActions.noteTooLong'),
    noteRequired: t('mweb.hostPodActions.noteRequired'),
    keepPod: t('mweb.hostPodActions.keepPod'),
    cancelling: t('mweb.hostPodActions.cancelling'),
    initiateRefunds: t('mweb.hostPodActions.initiateRefunds'),
    pasteTicketCode: t('mweb.hostPodActions.pasteTicketCode'),
    scanFrameHint: t('mweb.hostPodActions.scanFrameHint'),
    checkCode: t('mweb.hostPodActions.checkCode'),
    menuAria: (title) => t('mweb.hostPodActions.menuAria', { vars: { title } }),
    cancelIntro: (title) => t('mweb.hostPodActions.cancelIntro', { vars: { title } }),
    cancelOthers: (count) => t('mweb.hostPodActions.cancelOthers', { count }),
    cancelRefund: (amount, count) =>
      t('mweb.hostPodActions.cancelRefund', { count, vars: { amount, count } }),
  };
}

/** `shell.*` — every MUI portal. Word-for-word identical to `mweb.*` above. */
export function shellHostPodLabels(t: HostPodTranslate): HostPodActionLabels {
  return {
    clubAdmin: t('shell.podClubAdmin.menuItem'),
    seeAttendance: t('shell.attendance.menuItem'),
    slotRequest: t('shell.podPending.menuItem'),
    attendanceScanCta: t('shell.attendance.scanCta'),
    feedbackLink: t('shell.podFeedback.feedbackLink'),
    shareLink: t('shell.podFeedback.shareLink'),
    copyLink: t('shell.podFeedback.copyLink'),
    linkCopied: t('shell.podFeedback.linkCopied'),
    copyFailed: t('shell.podFeedback.copyFailed'),
    shareMessage: (title) => t('shell.podFeedback.shareMessage', { vars: { title } }),
    personOnTicket: t('shell.hostScan.personOnTicket'),
    peopleOnTicket: t('shell.hostScan.peopleOnTicket'),
    companionsTitle: t('shell.hostScan.companionsTitle'),
    companionsBody: (seats, count) => t('shell.hostScan.companionsBody', { vars: { seats, count } }),
    companionName: t('shell.hostScan.companionName'),
    companionPhone: t('shell.hostScan.companionPhone'),
    companionExtension: t('shell.hostScan.companionExtension'),
    companionVerifyCta: t('shell.hostScan.companionVerifyCta'),
    companionOtpHint: t('shell.hostScan.companionOtpHint'),
    companionOtpIncomplete: t('shell.hostScan.companionOtpIncomplete'),
    companionOtpDuplicate: t('shell.hostScan.companionOtpDuplicate'),
    companionVerified: t('shell.hostScan.companionVerified'),
    companionLocked: t('shell.hostScan.companionLocked'),
    companionOtpBlocked: t('shell.hostScan.companionOtpBlocked'),
    companionOtpFailed: t('shell.hostScan.companionOtpFailed'),
    otpSend: t('shell.attendance.otpSend'),
    otpSending: t('shell.attendance.otpSending'),
    otpResend: t('shell.attendance.otpResend'),
    otpCode: t('shell.attendance.otpCode'),
    otpCodeInvalid: t('shell.attendance.otpCodeInvalid'),
    otpVerify: t('shell.attendance.otpVerify'),
    otpVerifying: t('shell.attendance.otpVerifying'),
    otpCancel: t('shell.attendance.otpCancel'),
    otpExtensionInvalid: t('shell.attendance.otpExtensionInvalid'),
    otpTestCode: (code) => t('shell.attendance.otpTestCode', { vars: { code } }),
    companionsSubmit: t('shell.hostScan.companionsSubmit'),
    companionsIncomplete: t('shell.hostScan.companionsIncomplete'),
    companionsHeading: (index) => t('shell.hostScan.companionsHeading', { vars: { index } }),
    fieldRequired: t('shell.hostScan.fieldRequired'),
    nameInvalid: t('shell.hostScan.nameInvalid'),
    phoneInvalid: t('shell.hostScan.phoneInvalid'),
    attendanceMarked: t('shell.hostScan.attendanceMarked'),
    attendanceMarkedOne: (name) => t('shell.hostScan.attendanceMarkedOne', { vars: { name } }),
    attendanceMarkedGroup: (name, count) =>
      t('shell.hostScan.attendanceMarkedGroup', { vars: { name, count } }),
    alreadyMarked: t('shell.hostScan.alreadyMarked'),
    notMarkedYet: t('shell.hostScan.notMarkedYet'),
    checkedInList: t('shell.hostScan.checkedInList'),
    confirmDone: t('shell.hostScan.confirmDone'),
    contentCheck: t('shell.hostPodEdit.contentCheck'),
    spots: shellSpotsLabels(t),
    spotsVenueHint: (capacity, taken) =>
      t('shell.hostPodEdit.spotsVenueHint', { vars: { capacity, taken } }),
    spotsFreeHint: (min, taken) => t('shell.hostPodEdit.spotsFreeHint', { vars: { min, taken } }),
    spotsIncreaseOnly: t('shell.hostPodEdit.spotsIncreaseOnly'),
    menuTooltip: t('shell.hostPodActions.menuTooltip'),
    scanTickets: t('shell.hostPodActions.scanTickets'),
    completePod: t('shell.hostPodActions.completePod'),
    editPod: t('shell.hostPodActions.editPod'),
    cancelPod: t('shell.hostPodActions.cancelPod'),
    close: t('shell.hostPodActions.close'),
    cancel: t('shell.hostPodActions.cancel'),
    saving: t('shell.hostPodActions.saving'),
    saveChanges: t('shell.hostPodActions.saveChanges'),
    fieldTitle: t('shell.hostPodActions.fieldTitle'),
    fieldDescription: t('shell.hostPodActions.fieldDescription'),
    fieldMedia: t('shell.hostPodActions.fieldMedia'),
    titleTooShort: t('shell.hostPodActions.titleTooShort'),
    titleTooLong: t('shell.hostPodActions.titleTooLong'),
    descriptionTooShort: t('shell.hostPodActions.descriptionTooShort'),
    imageRequired: t('shell.hostPodActions.imageRequired'),
    resubmitTitle: t('shell.hostPodActions.resubmitTitle'),
    resubmitHint: t('shell.hostPodActions.resubmitHint'),
    resubmitting: t('shell.hostPodActions.resubmitting'),
    resubmitCta: t('shell.hostPodActions.resubmitCta'),
    venue: t('shell.hostPodActions.venue'),
    venueHint: t('shell.hostPodActions.venueHint'),
    completeHint: t('shell.hostPodActions.completeHint'),
    venueBillAmount: t('shell.hostPodActions.venueBillAmount'),
    venueBillRequired: t('shell.hostPodActions.venueBillRequired'),
    sharePreviewHint: t('shell.hostShare.previewHint'),
    sharePaid: t('shell.hostShare.customerPaid'),
    shareGst: (pct) => t('shell.hostShare.gst', { vars: { pct } }),
    sharePlatformFee: (pct) => t('shell.hostShare.platformFee', { vars: { pct } }),
    sharePool: t('shell.hostShare.pool'),
    shareVenueSlot: t('shell.hostShare.venueSlotPrice'),
    shareVenueReceives: t('shell.hostShare.venueReceives'),
    shareYouReceive: t('shell.hostShare.youReceive'),
    shareDuncitRevenue: t('shell.hostShare.duncitRevenue'),
    shareExpired: t('shell.hostShare.expired'),
    podMedia: t('shell.hostPodActions.podMedia'),
    completing: t('shell.hostPodActions.completing'),
    cancelNoOthers: t('shell.hostPodActions.cancelNoOthers'),
    cancelEmailOnly: t('shell.hostPodActions.cancelEmailOnly'),
    reason: t('shell.hostPodActions.reason'),
    reasonRequired: t('shell.hostPodActions.reasonRequired'),
    cancelReason: (value) => t(SHELL_CANCEL_REASON_KEYS[value] ?? 'shell.hostPodActions.cancelReasons.other'),
    note: t('shell.hostPodActions.note'),
    noteHint: t('shell.hostPodActions.noteHint'),
    noteTooLong: t('shell.hostPodActions.noteTooLong'),
    noteRequired: t('shell.hostPodActions.noteRequired'),
    keepPod: t('shell.hostPodActions.keepPod'),
    cancelling: t('shell.hostPodActions.cancelling'),
    initiateRefunds: t('shell.hostPodActions.initiateRefunds'),
    pasteTicketCode: t('shell.hostPodActions.pasteTicketCode'),
    scanFrameHint: t('shell.hostPodActions.scanFrameHint'),
    checkCode: t('shell.hostPodActions.checkCode'),
    menuAria: (title) => t('shell.hostPodActions.menuAria', { vars: { title } }),
    cancelIntro: (title) => t('shell.hostPodActions.cancelIntro', { vars: { title } }),
    cancelOthers: (count) => t('shell.hostPodActions.cancelOthers', { count }),
    cancelRefund: (amount, count) =>
      t('shell.hostPodActions.cancelRefund', { count, vars: { amount, count } }),
  };
}

/** Pick the namespace the calling surface ships. */
export function buildHostPodActionLabels(
  t: HostPodTranslate,
  namespace: 'mweb' | 'shell',
): HostPodActionLabels {
  return namespace === 'mweb' ? mwebHostPodLabels(t) : shellHostPodLabels(t);
}
