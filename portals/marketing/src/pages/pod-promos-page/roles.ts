/**
 * What a person may do on Pod promotions, by role — the same gates the server
 * holds (podPromo.resolver.ts). Hiding a button here is a courtesy; the server
 * refuses regardless.
 */
const MANAGE_ROLES = new Set(['SUPER_ADMIN', 'MARKETING_MANAGER']);

/** Saving the settings, promoting a pod now, re-making a banner and cancelling a promotion. */
export const canManagePodPromos = (roles: readonly string[] | null | undefined): boolean =>
  (roles ?? []).some((role) => MANAGE_ROLES.has(role));
