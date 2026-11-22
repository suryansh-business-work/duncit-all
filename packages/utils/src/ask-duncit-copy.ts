/**
 * Every Ask Duncit copy key a server code maps to, written out ONCE as a
 * literal — the translation gate (scripts/verify-translation-keys.mjs) can only
 * see keys spelled in full, so no surface composes one (see the
 * `localization-literal-keys` rule). mWeb and the native app both read these.
 */

export const ROLE_LABEL_KEYS = {
  MEMBER: 'askDuncit.roles.MEMBER',
  HOST: 'askDuncit.roles.HOST',
  VENUE_OWNER: 'askDuncit.roles.VENUE_OWNER',
  CLUB_ADMIN: 'askDuncit.roles.CLUB_ADMIN',
  REGIONAL_CLUB_ADMIN: 'askDuncit.roles.REGIONAL_CLUB_ADMIN',
  ECOMM_BRAND: 'askDuncit.roles.ECOMM_BRAND',
  FREELANCER: 'askDuncit.roles.FREELANCER',
  STAFF: 'askDuncit.roles.STAFF',
  SUPER_ADMIN: 'askDuncit.roles.SUPER_ADMIN',
} as const satisfies Readonly<Record<string, string>>;

export const UNAVAILABLE_KEYS = {
  KILL_SWITCH: 'askDuncit.unavailable.KILL_SWITCH',
  DISABLED: 'askDuncit.unavailable.DISABLED',
  ROLE_DISABLED: 'askDuncit.unavailable.ROLE_DISABLED',
} as const satisfies Readonly<Record<string, string>>;

export const ERROR_KEYS = {
  INJECTION_BLOCKED: 'askDuncit.errors.INJECTION_BLOCKED',
  NOT_CONFIGURED: 'askDuncit.errors.NOT_CONFIGURED',
  DISABLED: 'askDuncit.errors.DISABLED',
  NETWORK: 'askDuncit.errors.NETWORK',
  UPSTREAM: 'askDuncit.errors.UPSTREAM',
  EMPTY: 'askDuncit.errors.EMPTY',
  ABORTED: 'askDuncit.errors.ABORTED',
  INTERNAL: 'askDuncit.errors.INTERNAL',
  ASK_DUNCIT_QUOTA: 'askDuncit.errors.ASK_DUNCIT_QUOTA',
  ASK_DUNCIT_UNAVAILABLE: 'askDuncit.errors.ASK_DUNCIT_UNAVAILABLE',
  CONFLICT: 'askDuncit.errors.CONFLICT',
  FEATURE_DISABLED: 'askDuncit.errors.FEATURE_DISABLED',
  BAD_USER_INPUT: 'askDuncit.errors.BAD_USER_INPUT',
} as const satisfies Readonly<Record<string, string>>;

export const ACTION_STATUS_KEYS = {
  PENDING: 'askDuncit.actionStatus.PENDING',
  APPROVED: 'askDuncit.actionStatus.APPROVED',
  EXECUTING: 'askDuncit.actionStatus.EXECUTING',
  EXECUTED: 'askDuncit.actionStatus.EXECUTED',
  FAILED: 'askDuncit.actionStatus.FAILED',
  REJECTED: 'askDuncit.actionStatus.REJECTED',
  EXPIRED: 'askDuncit.actionStatus.EXPIRED',
  ROLLED_BACK: 'askDuncit.actionStatus.ROLLED_BACK',
} as const satisfies Readonly<Record<string, string>>;

export const TOOL_STATUS_KEYS = {
  RUNNING: 'askDuncit.toolStatus.RUNNING',
  OK: 'askDuncit.toolStatus.OK',
  DENIED: 'askDuncit.toolStatus.DENIED',
  ERROR: 'askDuncit.toolStatus.ERROR',
  BLOCKED: 'askDuncit.toolStatus.BLOCKED',
  INVALID: 'askDuncit.toolStatus.INVALID',
  AWAITING_APPROVAL: 'askDuncit.toolStatus.AWAITING_APPROVAL',
} as const satisfies Readonly<Record<string, string>>;

export const HANDOVER_TEAM_KEYS = {
  SUPPORT: 'askDuncit.handover.team.SUPPORT',
  ADMIN: 'askDuncit.handover.team.ADMIN',
  OPERATIONS: 'askDuncit.handover.team.OPERATIONS',
} as const satisfies Readonly<Record<string, string>>;

export const VOICE_ERROR_KEYS = {
  PERMISSION: 'askDuncit.voice.error.PERMISSION',
  UNSUPPORTED: 'askDuncit.voice.error.UNSUPPORTED',
  FAILED: 'askDuncit.voice.error.FAILED',
} as const satisfies Readonly<Record<string, string>>;

/**
 * Keys the SERVER sends (suggestion bubbles, proactive alerts and the prompts
 * their buttons send) — the apps render them with `t(label_key)`. Listed here
 * so the gate sees each one, and so a suggestion added on the server without
 * its copy here is caught in review.
 */
export const SERVER_COPY_KEYS: readonly string[] = [
  'askDuncit.suggestions.whatCanIDo',
  'askDuncit.suggestions.accountHealth',
  'askDuncit.suggestions.updateProfile',
  'askDuncit.suggestions.explainThisPod',
  'askDuncit.suggestions.explainThisClub',
  'askDuncit.suggestions.findPodsNearMe',
  'askDuncit.suggestions.myUpcomingPods',
  'askDuncit.suggestions.myHostedPods',
  'askDuncit.suggestions.hostPerformance',
  'askDuncit.suggestions.venueBookings',
  'askDuncit.suggestions.venueHealth',
  'askDuncit.suggestions.clubPods',
  'askDuncit.suggestions.clubMembers',
  'askDuncit.suggestions.regionClubs',
  'askDuncit.suggestions.brandOrders',
  'askDuncit.suggestions.brandProducts',
  'askDuncit.suggestions.gigJobs',
  'askDuncit.suggestions.pendingWork',
  'askDuncit.suggestions.platformHealth',
  'askDuncit.suggestions.pendingApprovals',
  'askDuncit.alerts.healthRed',
  'askDuncit.alerts.healthYellow',
  'askDuncit.alerts.pendingApprovals',
];

/** The key for a code, or the fallback key when the code is unknown — never raw text. */
export const keyFor = (map: Readonly<Record<string, string>>, code: string | null | undefined, fallback: string): string =>
  (code ? map[code] : undefined) ?? fallback;
