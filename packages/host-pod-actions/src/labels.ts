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

export type HostPodTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
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
}

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
  };
}

/** Pick the namespace the calling surface ships. */
export function buildHostPodActionLabels(
  t: HostPodTranslate,
  namespace: 'mweb' | 'shell',
): HostPodActionLabels {
  return namespace === 'mweb' ? mwebHostPodLabels(t) : shellHostPodLabels(t);
}
