/**
 * What a person may do to a lead, by role — the same gates the server holds
 * (marketingLead.resolver.ts, and marketing.resolver.ts for the owner list).
 * Hiding a button here is a courtesy; the server refuses regardless.
 */
const PROMOTE_ROLES = new Set(['SUPER_ADMIN', 'MARKETING_MANAGER']);
/** The owner picker lists everybody who can open this portal — a list only these roles may read. */
const OWNER_PICKER_ROLES = new Set(['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER']);

const hasAny = (roles: readonly string[] | null | undefined, allowed: ReadonlySet<string>) =>
  (roles ?? []).some((role) => allowed.has(role));

/** Handing a lead to the CRM is a manager's call. */
export const canPromote = (roles: readonly string[] | null | undefined): boolean => hasAny(roles, PROMOTE_ROLES);

export const canPickOwner = (roles: readonly string[] | null | undefined): boolean => hasAny(roles, OWNER_PICKER_ROLES);
