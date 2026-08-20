import type { AutoPodRole } from './auto-pod';

/**
 * Every word the Auto Pod surfaces render, assembled from the calling surface's
 * own translator.
 *
 * Each key is written out as a literal `t('…')` rather than built from a
 * namespace + a suffix, because `scripts/verify-translation-keys.mjs` greps
 * source for the literal string — a composed key is reported as
 * shipped-but-never-rendered and fails the Shared Gates job. Same shape (and
 * same reason) as `buildAttendanceLabels`.
 *
 * mWeb and the native app share `mweb.*`; every MUI portal shares `shell.*`.
 * The server stores one row per key path, so the two namespaces cannot collapse
 * into one — the values are kept word-for-word identical instead.
 */
export type AutoPodTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface AutoPodLabels {
  venueTitle: string;
  hostTitle: string;
  clubTitle: string;
  /** The three enrolment ticks, by role. */
  tick: (role: AutoPodRole) => string;
  tickPending: string;
  tickDone: string;
  needsAction: string;
  claimedByYou: string;
  acceptCta: string;
  assignMyselfCta: string;
  claimForClubCta: string;
  pickVenue: string;
  pickSlot: string;
  pickClub: string;
  confirmAccept: string;
  confirmAcceptBody: string;
  confirmAssign: string;
  confirmAssignBody: string;
  confirmClaim: string;
  confirmClaimBody: string;
  priceLabel: string;
  spotsLabel: string;
  expectedEarnings: (amount: string) => string;
  /** Who the offer is still waiting on. */
  waitingOn: (role: AutoPodRole) => string;
  liveNow: string;
  viewPod: string;
  cancelled: string;
  expired: string;
  claimedElsewhere: string;
  /** Closes a dialog without acting. */
  dismiss: string;
  /** Empty state for the role whose queue is being rendered. */
  empty: (role: AutoPodRole) => string;
  noSlots: string;
  addAvailability: string;
  loadFailed: string;
  retry: string;
}

/** mWeb + native (`mweb.autoPods.*`). */
export function mwebAutoPodLabels(t: AutoPodTranslate): AutoPodLabels {
  const tickByRole: Record<AutoPodRole, string> = {
    venue: t('mweb.autoPods.tickVenue'),
    host: t('mweb.autoPods.tickHost'),
    club: t('mweb.autoPods.tickClubAdmin'),
  };
  const waitingByRole: Record<AutoPodRole, string> = {
    venue: t('mweb.autoPods.waitingVenue'),
    host: t('mweb.autoPods.waitingHost'),
    club: t('mweb.autoPods.waitingClub'),
  };
  const emptyByRole: Record<AutoPodRole, string> = {
    venue: t('mweb.autoPods.emptyVenue'),
    host: t('mweb.autoPods.emptyHost'),
    club: t('mweb.autoPods.emptyClub'),
  };
  return {
    venueTitle: t('mweb.autoPods.venueTitle'),
    hostTitle: t('mweb.autoPods.hostTitle'),
    clubTitle: t('mweb.autoPods.clubTitle'),
    tick: (role) => tickByRole[role],
    tickPending: t('mweb.autoPods.tickPending'),
    tickDone: t('mweb.autoPods.tickDone'),
    needsAction: t('mweb.autoPods.needsAction'),
    claimedByYou: t('mweb.autoPods.claimedByYou'),
    acceptCta: t('mweb.autoPods.acceptCta'),
    assignMyselfCta: t('mweb.autoPods.assignMyselfCta'),
    claimForClubCta: t('mweb.autoPods.claimForClubCta'),
    pickVenue: t('mweb.autoPods.pickVenue'),
    pickSlot: t('mweb.autoPods.pickSlot'),
    pickClub: t('mweb.autoPods.pickClub'),
    confirmAccept: t('mweb.autoPods.confirmAccept'),
    confirmAcceptBody: t('mweb.autoPods.confirmAcceptBody'),
    confirmAssign: t('mweb.autoPods.confirmAssign'),
    confirmAssignBody: t('mweb.autoPods.confirmAssignBody'),
    confirmClaim: t('mweb.autoPods.confirmClaim'),
    confirmClaimBody: t('mweb.autoPods.confirmClaimBody'),
    priceLabel: t('mweb.autoPods.priceLabel'),
    spotsLabel: t('mweb.autoPods.spotsLabel'),
    expectedEarnings: (amount) => t('mweb.autoPods.expectedEarnings', { vars: { amount } }),
    waitingOn: (role) => waitingByRole[role],
    liveNow: t('mweb.autoPods.liveNow'),
    viewPod: t('mweb.autoPods.viewPod'),
    cancelled: t('mweb.autoPods.cancelled'),
    expired: t('mweb.autoPods.expired'),
    claimedElsewhere: t('mweb.autoPods.claimedElsewhere'),
    dismiss: t('mweb.autoPods.dismiss'),
    empty: (role) => emptyByRole[role],
    noSlots: t('mweb.autoPods.noSlots'),
    addAvailability: t('mweb.autoPods.addAvailability'),
    loadFailed: t('mweb.autoPods.loadFailed'),
    retry: t('mweb.autoPods.retry'),
  };
}

/** The MUI portals (`shell.autoPods.*`) — word-for-word the same copy. */
export function shellAutoPodLabels(t: AutoPodTranslate): AutoPodLabels {
  const tickByRole: Record<AutoPodRole, string> = {
    venue: t('shell.autoPods.tickVenue'),
    host: t('shell.autoPods.tickHost'),
    club: t('shell.autoPods.tickClubAdmin'),
  };
  const waitingByRole: Record<AutoPodRole, string> = {
    venue: t('shell.autoPods.waitingVenue'),
    host: t('shell.autoPods.waitingHost'),
    club: t('shell.autoPods.waitingClub'),
  };
  const emptyByRole: Record<AutoPodRole, string> = {
    venue: t('shell.autoPods.emptyVenue'),
    host: t('shell.autoPods.emptyHost'),
    club: t('shell.autoPods.emptyClub'),
  };
  return {
    venueTitle: t('shell.autoPods.venueTitle'),
    hostTitle: t('shell.autoPods.hostTitle'),
    clubTitle: t('shell.autoPods.clubTitle'),
    tick: (role) => tickByRole[role],
    tickPending: t('shell.autoPods.tickPending'),
    tickDone: t('shell.autoPods.tickDone'),
    needsAction: t('shell.autoPods.needsAction'),
    claimedByYou: t('shell.autoPods.claimedByYou'),
    acceptCta: t('shell.autoPods.acceptCta'),
    assignMyselfCta: t('shell.autoPods.assignMyselfCta'),
    claimForClubCta: t('shell.autoPods.claimForClubCta'),
    pickVenue: t('shell.autoPods.pickVenue'),
    pickSlot: t('shell.autoPods.pickSlot'),
    pickClub: t('shell.autoPods.pickClub'),
    confirmAccept: t('shell.autoPods.confirmAccept'),
    confirmAcceptBody: t('shell.autoPods.confirmAcceptBody'),
    confirmAssign: t('shell.autoPods.confirmAssign'),
    confirmAssignBody: t('shell.autoPods.confirmAssignBody'),
    confirmClaim: t('shell.autoPods.confirmClaim'),
    confirmClaimBody: t('shell.autoPods.confirmClaimBody'),
    priceLabel: t('shell.autoPods.priceLabel'),
    spotsLabel: t('shell.autoPods.spotsLabel'),
    expectedEarnings: (amount) => t('shell.autoPods.expectedEarnings', { vars: { amount } }),
    waitingOn: (role) => waitingByRole[role],
    liveNow: t('shell.autoPods.liveNow'),
    viewPod: t('shell.autoPods.viewPod'),
    cancelled: t('shell.autoPods.cancelled'),
    expired: t('shell.autoPods.expired'),
    claimedElsewhere: t('shell.autoPods.claimedElsewhere'),
    dismiss: t('shell.autoPods.dismiss'),
    empty: (role) => emptyByRole[role],
    noSlots: t('shell.autoPods.noSlots'),
    addAvailability: t('shell.autoPods.addAvailability'),
    loadFailed: t('shell.autoPods.loadFailed'),
    retry: t('shell.autoPods.retry'),
  };
}

/**
 * The "Normal Pod or Auto Pod?" question every portal's New Pod button asks.
 *
 * Same literal-key rule as the labels above: `verify-translation-keys.mjs` greps
 * source for the exact `t('…')` string, so each one is written out in full.
 */
export interface PodKindLabels {
  /** The button that asks the question. */
  newPodCta: string;
  title: string;
  subtitle: string;
  normalTitle: string;
  normalDesc: string;
  autoTitle: string;
  autoDesc: string;
  dismiss: string;
}

/** The MUI portals (`shell.podKind.*`). */
export function shellPodKindLabels(t: AutoPodTranslate): PodKindLabels {
  return {
    newPodCta: t('shell.podKind.newPodCta'),
    title: t('shell.podKind.title'),
    subtitle: t('shell.podKind.subtitle'),
    normalTitle: t('shell.podKind.normalTitle'),
    normalDesc: t('shell.podKind.normalDesc'),
    autoTitle: t('shell.podKind.autoTitle'),
    autoDesc: t('shell.podKind.autoDesc'),
    dismiss: t('shell.podKind.dismiss'),
  };
}
