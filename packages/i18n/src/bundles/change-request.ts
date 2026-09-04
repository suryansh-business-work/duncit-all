import type { NestedCatalogue } from '../catalogue';

/**
 * Request Change copy — the pod-row action, the confirm dialog behind it, the
 * Change Requests section in every partner studio, and the admin console that
 * works the queue.
 *
 * A namespace of its own rather than `mweb.*` or `shell.*`, because the same
 * eleven sentences are rendered by FIVE surfaces: mWeb, the native app, the
 * Partners console, the Admin console and (through the shared pod row) the
 * Club Admin console. A package's `t()` resolves through whichever surface
 * mounted it, so copy parked in one surface's bundle prints raw keys the
 * moment another opens the same screen offline (rules 27 + 38 + 40).
 *
 * The RULES live in `@duncit/utils` (`pod-change-request.ts`); the words that
 * explain them live here.
 */
export const CHANGE_REQUEST_BUNDLE: NestedCatalogue = {
  changeRequest: {
    // --- The pod-row action, one label per role -----------------------------
    menuVenue: 'Request Change Venue',
    menuHost: 'Request Change Host',
    menuClubAdmin: 'Request Change Club Admin',
    blockedClosed: 'This pod has already finished or been cancelled.',
    blockedOpen: 'Duncit is already working on your change request for this pod.',

    // --- The confirm dialog ------------------------------------------------
    confirmTitle: 'Ask Duncit for a change?',
    confirmVenue:
      'Duncit will look for a different venue for this pod. Nothing moves until a new venue accepts it.',
    confirmHost:
      'Duncit will look for a different host for this pod. Nothing moves until a new host accepts it.',
    confirmClubAdmin:
      'Duncit will look for a different admin for this pod’s club. Nothing moves until one accepts.',
    penaltyNotice: {
      one: 'This deducts {{points}} Account Health point.',
      other: 'This deducts {{points}} Account Health points.',
    },
    penaltyFree: 'This does not affect your Account Health.',
    attendeeNotice: {
      one: '{{count}} person has already booked a seat on this pod.',
      other: '{{count}} people have already booked seats on this pod.',
    },
    reasonLabel: 'Why do you need this changed?',
    reasonHint: 'Tell Duncit what happened. This is read by the team, never by guests.',
    reasonRequired: 'Please tell us why you need this change',
    reasonTooLong: 'Keep this under 500 characters',
    confirmCta: 'Yes, request a change',
    cancelCta: 'Not now',
    filed: 'Duncit has your request. We will find a replacement.',

    // --- The studio section ------------------------------------------------
    sectionTitle: 'Change Requests',
    sectionSubtitle: 'What you asked Duncit to change, and what Duncit is asking of you.',
    incomingTitle: 'Waiting on you',
    incomingSubtitle: 'A pod that needs you. Approve it and it becomes yours.',
    incomingEmpty: 'Nothing is waiting on you right now.',
    mineTitle: 'Your requests',
    mineEmpty: 'You have not asked Duncit to change anything.',
    approve: 'Approve',
    pass: 'Pass',
    passTitle: 'Pass on this pod?',
    passBody: 'Duncit will offer it to somebody else. The pod keeps its current partner meanwhile.',
    passReasonLabel: 'Anything Duncit should know? (optional)',
    approved: 'Done — the pod is yours.',
    passed: 'Passed. Duncit will ask somebody else.',
    withdraw: 'Withdraw',
    withdrawTitle: 'Withdraw this request?',
    withdrawBody:
      'Duncit will stop looking for a replacement. Your Account Health points are not returned.',
    withdrawn: 'Request withdrawn.',
    retry: 'Try again',
    loadFailed: 'Could not load your change requests.',
    open: 'Open',

    // --- Row facts ---------------------------------------------------------
    requestNo: 'Request',
    filedOn: 'Requested',
    attendees: 'Attendees',
    pointsDeducted: 'Health points',
    offeredTo: 'Offered to',
    slot: 'Slot',
    reason: 'Reason',
    noReason: 'No reason given',

    // --- Statuses ----------------------------------------------------------
    statusOpen: 'Looking for a replacement',
    statusOffered: 'Offered — waiting on a partner',
    statusResolved: 'Resolved',
    statusWithdrawn: 'Withdrawn',
    resolvedReplaced: 'Replaced',
    resolvedCancelled: 'Pod cancelled and refunded',

    // --- Roles -------------------------------------------------------------
    roleVenue: 'Venue',
    roleHost: 'Host',
    roleClubAdmin: 'Club Admin',
  },
};
