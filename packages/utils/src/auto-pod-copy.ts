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
  /** Who the offer is still waiting on — the first missing role. */
  waitingOn: (role: AutoPodRole) => string;
  /** Everyone the offer is still waiting on, in tick order. */
  waitingFor: (roles: AutoPodRole[]) => string;
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
  /** The filters at the top of every queue page. */
  locationLabel: string;
  allLocations: string;
  changeLocation: string;
  categoryLabel: string;
  allCategories: string;
  noHostCategories: string;
  /** The card's city line: pinned by the first enrolment, or not yet. */
  pinnedTo: (city: string) => string;
  unpinned: string;
  /** The card's mode line on an offer with no venue to enrol. */
  virtualPod: string;
  /** The venue queue's own venue picker, and the category line under it. */
  venueLabel: string;
  noVenues: string;
  venueCategory: (path: string) => string;
  noVenueCategory: string;
  pickVenueFirst: string;
  /** The venue card's countdown to the offer leaving their list. */
  removedIn: (hours: number, minutes: number) => string;
  /** The slot picker: how far ahead it reaches, and what a slot pays the venue. */
  slotWindow: (days: number) => string;
  potentialEarning: (amount: string) => string;
  slotNotViable: string;
  acceptingWith: (venue: string) => string;
  /** The heading over the rows this viewer already enrolled in — one per role. */
  assignedHeading: (role: AutoPodRole) => string;
  /** Taking an enrolment back: the button, the warning and what it costs. */
  withdrawCta: string;
  withdrawTitle: string;
  withdrawWarning: string;
  withdrawPenalty: (points: number) => string;
  withdrawConfirm: string;
  withdrawn: string;
  /** The host's own numbers on the offer, and what they add up to. */
  ticketPrice: string;
  spotsField: string;
  spotsRange: (min: number, max: number) => string;
  projectionTitle: string;
  projectionHost: (amount: string) => string;
  projectionVenue: (amount: string) => string;
  projectionClub: (amount: string) => string;
  projectionFees: (amount: string) => string;
  projectionNotViable: string;
  /** A host's "Assign Myself" on an offer that takes its city from them. */
  pickLocationFirst: string;
  willPinTo: (city: string) => string;
  /** A pinned offer only takes a venue / club from its own city. */
  noVenueInCity: (city: string) => string;
  noClubInCity: (city: string) => string;
}

/** "a venue, a host, a club admin" — the missing roles as one list. */
const joinRoles = (roles: AutoPodRole[], name: Record<AutoPodRole, string>) =>
  roles.map((role) => name[role]).join(', ');

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
  const roleName: Record<AutoPodRole, string> = {
    venue: t('mweb.autoPods.roleVenue'),
    host: t('mweb.autoPods.roleHost'),
    club: t('mweb.autoPods.roleClub'),
  };
  const assignedByRole: Record<AutoPodRole, string> = {
    venue: t('mweb.autoPods.assignedVenue'),
    host: t('mweb.autoPods.assignedHost'),
    club: t('mweb.autoPods.assignedClub'),
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
    confirmAcceptBody: t('mweb.autoPods.confirmAcceptAnyOrder'),
    confirmAssign: t('mweb.autoPods.confirmAssign'),
    confirmAssignBody: t('mweb.autoPods.confirmAssignAnyOrder'),
    confirmClaim: t('mweb.autoPods.confirmClaim'),
    confirmClaimBody: t('mweb.autoPods.confirmClaimBody'),
    priceLabel: t('mweb.autoPods.priceLabel'),
    spotsLabel: t('mweb.autoPods.spotsLabel'),
    expectedEarnings: (amount) => t('mweb.autoPods.expectedEarnings', { vars: { amount } }),
    waitingOn: (role) => waitingByRole[role],
    waitingFor: (roles) =>
      t('mweb.autoPods.waitingFor', { vars: { roles: joinRoles(roles, roleName) } }),
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
    locationLabel: t('mweb.autoPods.locationLabel'),
    allLocations: t('mweb.autoPods.allLocations'),
    changeLocation: t('mweb.autoPods.changeLocation'),
    categoryLabel: t('mweb.autoPods.categoryLabel'),
    allCategories: t('mweb.autoPods.allCategories'),
    noHostCategories: t('mweb.autoPods.noHostCategories'),
    pinnedTo: (city) => t('mweb.autoPods.pinnedTo', { vars: { city } }),
    unpinned: t('mweb.autoPods.unpinned'),
    virtualPod: t('mweb.autoPods.virtualPod'),
    venueLabel: t('mweb.autoPods.venueLabel'),
    noVenues: t('mweb.autoPods.noVenues'),
    venueCategory: (path) => t('mweb.autoPods.venueCategory', { vars: { path } }),
    noVenueCategory: t('mweb.autoPods.noVenueCategory'),
    pickVenueFirst: t('mweb.autoPods.pickVenueFirst'),
    removedIn: (hours, minutes) => t('mweb.autoPods.removedIn', { vars: { hours, minutes } }),
    slotWindow: (days) => t('mweb.autoPods.slotWindow', { vars: { days } }),
    potentialEarning: (amount) => t('mweb.autoPods.potentialEarning', { vars: { amount } }),
    slotNotViable: t('mweb.autoPods.slotNotViable'),
    acceptingWith: (venue) => t('mweb.autoPods.acceptingWith', { vars: { venue } }),
    assignedHeading: (role) => assignedByRole[role],
    withdrawCta: t('mweb.autoPods.withdrawCta'),
    withdrawTitle: t('mweb.autoPods.withdrawTitle'),
    withdrawWarning: t('mweb.autoPods.withdrawWarning'),
    withdrawPenalty: (points) => t('mweb.autoPods.withdrawPenalty', { vars: { points } }),
    withdrawConfirm: t('mweb.autoPods.withdrawConfirm'),
    withdrawn: t('mweb.autoPods.withdrawn'),
    ticketPrice: t('mweb.autoPods.ticketPrice'),
    spotsField: t('mweb.autoPods.spotsField'),
    spotsRange: (min, max) => t('mweb.autoPods.spotsRange', { vars: { min, max } }),
    projectionTitle: t('mweb.autoPods.projectionTitle'),
    projectionHost: (amount) => t('mweb.autoPods.projectionHost', { vars: { amount } }),
    projectionVenue: (amount) => t('mweb.autoPods.projectionVenue', { vars: { amount } }),
    projectionClub: (amount) => t('mweb.autoPods.projectionClub', { vars: { amount } }),
    projectionFees: (amount) => t('mweb.autoPods.projectionFees', { vars: { amount } }),
    projectionNotViable: t('mweb.autoPods.projectionNotViable'),
    pickLocationFirst: t('mweb.autoPods.pickLocationFirst'),
    willPinTo: (city) => t('mweb.autoPods.willPinTo', { vars: { city } }),
    noVenueInCity: (city) => t('mweb.autoPods.noVenueInCity', { vars: { city } }),
    noClubInCity: (city) => t('mweb.autoPods.noClubInCity', { vars: { city } }),
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
  const roleName: Record<AutoPodRole, string> = {
    venue: t('shell.autoPods.roleVenue'),
    host: t('shell.autoPods.roleHost'),
    club: t('shell.autoPods.roleClub'),
  };
  const assignedByRole: Record<AutoPodRole, string> = {
    venue: t('shell.autoPods.assignedVenue'),
    host: t('shell.autoPods.assignedHost'),
    club: t('shell.autoPods.assignedClub'),
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
    confirmAcceptBody: t('shell.autoPods.confirmAcceptAnyOrder'),
    confirmAssign: t('shell.autoPods.confirmAssign'),
    confirmAssignBody: t('shell.autoPods.confirmAssignAnyOrder'),
    confirmClaim: t('shell.autoPods.confirmClaim'),
    confirmClaimBody: t('shell.autoPods.confirmClaimBody'),
    priceLabel: t('shell.autoPods.priceLabel'),
    spotsLabel: t('shell.autoPods.spotsLabel'),
    expectedEarnings: (amount) => t('shell.autoPods.expectedEarnings', { vars: { amount } }),
    waitingOn: (role) => waitingByRole[role],
    waitingFor: (roles) =>
      t('shell.autoPods.waitingFor', { vars: { roles: joinRoles(roles, roleName) } }),
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
    locationLabel: t('shell.autoPods.locationLabel'),
    allLocations: t('shell.autoPods.allLocations'),
    changeLocation: t('shell.autoPods.changeLocation'),
    categoryLabel: t('shell.autoPods.categoryLabel'),
    allCategories: t('shell.autoPods.allCategories'),
    noHostCategories: t('shell.autoPods.noHostCategories'),
    pinnedTo: (city) => t('shell.autoPods.pinnedTo', { vars: { city } }),
    unpinned: t('shell.autoPods.unpinned'),
    virtualPod: t('shell.autoPods.virtualPod'),
    venueLabel: t('shell.autoPods.venueLabel'),
    noVenues: t('shell.autoPods.noVenues'),
    venueCategory: (path) => t('shell.autoPods.venueCategory', { vars: { path } }),
    noVenueCategory: t('shell.autoPods.noVenueCategory'),
    pickVenueFirst: t('shell.autoPods.pickVenueFirst'),
    removedIn: (hours, minutes) => t('shell.autoPods.removedIn', { vars: { hours, minutes } }),
    slotWindow: (days) => t('shell.autoPods.slotWindow', { vars: { days } }),
    potentialEarning: (amount) => t('shell.autoPods.potentialEarning', { vars: { amount } }),
    slotNotViable: t('shell.autoPods.slotNotViable'),
    acceptingWith: (venue) => t('shell.autoPods.acceptingWith', { vars: { venue } }),
    assignedHeading: (role) => assignedByRole[role],
    withdrawCta: t('shell.autoPods.withdrawCta'),
    withdrawTitle: t('shell.autoPods.withdrawTitle'),
    withdrawWarning: t('shell.autoPods.withdrawWarning'),
    withdrawPenalty: (points) => t('shell.autoPods.withdrawPenalty', { vars: { points } }),
    withdrawConfirm: t('shell.autoPods.withdrawConfirm'),
    withdrawn: t('shell.autoPods.withdrawn'),
    ticketPrice: t('shell.autoPods.ticketPrice'),
    spotsField: t('shell.autoPods.spotsField'),
    spotsRange: (min, max) => t('shell.autoPods.spotsRange', { vars: { min, max } }),
    projectionTitle: t('shell.autoPods.projectionTitle'),
    projectionHost: (amount) => t('shell.autoPods.projectionHost', { vars: { amount } }),
    projectionVenue: (amount) => t('shell.autoPods.projectionVenue', { vars: { amount } }),
    projectionClub: (amount) => t('shell.autoPods.projectionClub', { vars: { amount } }),
    projectionFees: (amount) => t('shell.autoPods.projectionFees', { vars: { amount } }),
    projectionNotViable: t('shell.autoPods.projectionNotViable'),
    pickLocationFirst: t('shell.autoPods.pickLocationFirst'),
    willPinTo: (city) => t('shell.autoPods.willPinTo', { vars: { city } }),
    noVenueInCity: (city) => t('shell.autoPods.noVenueInCity', { vars: { city } }),
    noClubInCity: (city) => t('shell.autoPods.noClubInCity', { vars: { city } }),
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
