/**
 * The copy the Earn meeting dialogs render, assembled from the calling
 * surface's translator.
 *
 * Every key is written out as a literal `t('…')` call rather than built from a
 * namespace + suffix — `scripts/verify-translation-keys.mjs` greps source for
 * the literal key, so a computed one is reported as shipped-but-never-rendered
 * and fails the Shared Gates job. Same shape as @duncit/host-pod-actions'
 * labels and @duncit/slots' buildSlotLabels.
 *
 * mWeb and the native app share `mweb.*`; every MUI portal shares `shell.*`.
 * The server stores one row per key path, so the two namespaces cannot collapse
 * into one — the values are kept word-for-word identical instead.
 */

export type EarnTranslate = (
  key: string,
  options?: { count?: number; vars?: Record<string, string | number> },
) => string;

export interface EarnMeetingLabels {
  cancelTitle: string;
  cancelBody: string;
  cancelReasonLabel: string;
  cancelReasonHint: string;
  keepMeeting: string;
  cancelling: string;
  cancelCta: string;
  cancelFailed: string;
  rescheduleTitle: string;
  /** "Currently booked for 12 Sep 2026, 18:00. You can reschedule once." */
  currentlyBooked: (when: string) => string;
  noSlots: string;
  movingFromTo: (from: string, to: string) => string;
  rescheduleReasonLabel: string;
  rescheduleReasonHint: string;
  close: string;
  moving: string;
  moveCta: string;
  pickSlot: string;
  rescheduleFailed: string;
  reasonRequired: string;
  reasonTooLong: string;
  aiMonitoring: string;
}

/** `mweb.*` — mWeb and the native app (rule 27: one namespace for both). */
export function mwebEarnMeetingLabels(t: EarnTranslate): EarnMeetingLabels {
  return {
    cancelTitle: t('mweb.earnMeeting.cancelTitle'),
    cancelBody: t('mweb.earnMeeting.cancelBody'),
    cancelReasonLabel: t('mweb.earnMeeting.cancelReasonLabel'),
    cancelReasonHint: t('mweb.earnMeeting.cancelReasonHint'),
    keepMeeting: t('mweb.earnMeeting.keepMeeting'),
    cancelling: t('mweb.earnMeeting.cancelling'),
    cancelCta: t('mweb.earnMeeting.cancelCta'),
    cancelFailed: t('mweb.earnMeeting.cancelFailed'),
    rescheduleTitle: t('mweb.earnMeeting.rescheduleTitle'),
    currentlyBooked: (when) => t('mweb.earnMeeting.currentlyBooked', { vars: { when } }),
    noSlots: t('mweb.earnMeeting.noSlots'),
    movingFromTo: (from, to) => t('mweb.earnMeeting.movingFromTo', { vars: { from, to } }),
    rescheduleReasonLabel: t('mweb.earnMeeting.rescheduleReasonLabel'),
    rescheduleReasonHint: t('mweb.earnMeeting.rescheduleReasonHint'),
    close: t('mweb.earnMeeting.close'),
    moving: t('mweb.earnMeeting.moving'),
    moveCta: t('mweb.earnMeeting.moveCta'),
    pickSlot: t('mweb.earnMeeting.pickSlot'),
    rescheduleFailed: t('mweb.earnMeeting.rescheduleFailed'),
    reasonRequired: t('mweb.earnMeeting.reasonRequired'),
    reasonTooLong: t('mweb.earnMeeting.reasonTooLong'),
    aiMonitoring: t('mweb.earnMeeting.aiMonitoring'),
  };
}

/** `shell.*` — every MUI portal. Word-for-word identical to `mweb.*` above. */
export function shellEarnMeetingLabels(t: EarnTranslate): EarnMeetingLabels {
  return {
    cancelTitle: t('shell.earnMeeting.cancelTitle'),
    cancelBody: t('shell.earnMeeting.cancelBody'),
    cancelReasonLabel: t('shell.earnMeeting.cancelReasonLabel'),
    cancelReasonHint: t('shell.earnMeeting.cancelReasonHint'),
    keepMeeting: t('shell.earnMeeting.keepMeeting'),
    cancelling: t('shell.earnMeeting.cancelling'),
    cancelCta: t('shell.earnMeeting.cancelCta'),
    cancelFailed: t('shell.earnMeeting.cancelFailed'),
    rescheduleTitle: t('shell.earnMeeting.rescheduleTitle'),
    currentlyBooked: (when) => t('shell.earnMeeting.currentlyBooked', { vars: { when } }),
    noSlots: t('shell.earnMeeting.noSlots'),
    movingFromTo: (from, to) => t('shell.earnMeeting.movingFromTo', { vars: { from, to } }),
    rescheduleReasonLabel: t('shell.earnMeeting.rescheduleReasonLabel'),
    rescheduleReasonHint: t('shell.earnMeeting.rescheduleReasonHint'),
    close: t('shell.earnMeeting.close'),
    moving: t('shell.earnMeeting.moving'),
    moveCta: t('shell.earnMeeting.moveCta'),
    pickSlot: t('shell.earnMeeting.pickSlot'),
    rescheduleFailed: t('shell.earnMeeting.rescheduleFailed'),
    reasonRequired: t('shell.earnMeeting.reasonRequired'),
    reasonTooLong: t('shell.earnMeeting.reasonTooLong'),
    aiMonitoring: t('shell.earnMeeting.aiMonitoring'),
  };
}

/** Pick the namespace the calling surface ships. */
export function buildEarnMeetingLabels(
  t: EarnTranslate,
  namespace: 'mweb' | 'shell',
): EarnMeetingLabels {
  return namespace === 'mweb' ? mwebEarnMeetingLabels(t) : shellEarnMeetingLabels(t);
}
