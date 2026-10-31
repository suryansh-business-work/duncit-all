/**
 * What a person may do on Outreach, by role — the same gates the server holds
 * (outreach.resolver.ts). Hiding a button here is a courtesy; the server
 * refuses regardless.
 */
const MANAGE_ROLES = new Set(['SUPER_ADMIN', 'MARKETING_MANAGER']);

/** Switching a sequence on or off, enrolling leads and pausing, resuming or removing an enrollment. */
export const canManageOutreach = (roles: readonly string[] | null | undefined): boolean =>
  (roles ?? []).some((role) => MANAGE_ROLES.has(role));
