/**
 * The four capacities a payout can be withdrawn in — the server's
 * `WithdrawerRole` enum (stamped on the withdrawal at request time).
 *
 * The labels are the wording Finance uses for these partners; `VENUE_OWNER`
 * reads "Venue Owner" here rather than the "Venue Partner" chip used elsewhere.
 */
export const WITHDRAWER_ROLES = ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER', 'CLUB_ADMIN'] as const;

export type WithdrawerRole = (typeof WITHDRAWER_ROLES)[number];

/** The role filter's "no filter" sentinel — never sent to the server. */
export const ALL_ROLES = 'ALL';

export type RoleFilterValue = WithdrawerRole | typeof ALL_ROLES;

export const ROLE_LABELS: Record<WithdrawerRole, string> = {
  HOST: 'Host',
  VENUE_OWNER: 'Venue Owner',
  ECOMM_MANAGER: 'E-Commerce Brand',
  CLUB_ADMIN: 'Club Admin',
};

export const ROLE_OPTIONS: ReadonlyArray<{ value: WithdrawerRole; label: string }> =
  WITHDRAWER_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }));

/** Role -> the matching field on `WithdrawalMinimums` / `UpdateWithdrawalMinimumsInput`. */
export const ROLE_MINIMUM_FIELD = {
  HOST: 'host',
  VENUE_OWNER: 'venue_owner',
  ECOMM_MANAGER: 'ecomm_manager',
  CLUB_ADMIN: 'club_admin',
} as const satisfies Record<WithdrawerRole, string>;

export type MinimumField = (typeof ROLE_MINIMUM_FIELD)[WithdrawerRole];

/** Mirrors the server's DEFAULT_MIN_WITHDRAWAL, used before the query resolves. */
export const DEFAULT_MIN_WITHDRAWAL = 1000;

/** What each role's floor gates, shown under its field on the settings page. */
export const ROLE_HINTS: Record<WithdrawerRole, string> = {
  HOST: 'Wallet earnings a host built up from the pods they ran.',
  VENUE_OWNER: 'Slot fees settled to a venue after its pods completed.',
  ECOMM_MANAGER: 'Product sale earnings settled to an e-commerce brand.',
  CLUB_ADMIN: 'The club admin cut taken off each pod in their club.',
};

export const roleLabel = (role: string): string =>
  ROLE_LABELS[role as WithdrawerRole] ?? role;
