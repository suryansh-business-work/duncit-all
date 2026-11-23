import type { PortalAccessEntry } from '../jump-to-portal/queries';

export interface RolePortals {
  role: string;
  portals: PortalAccessEntry[];
}

/** `FINANCE_MANAGER` → `FINANCE MANAGER`, the same casing the dashboard chips used. */
export const roleLabel = (role: string): string => role.replaceAll('_', ' ');

/** The header's one-line summary: the first role, then how many more there are. */
export const roleSummary = (roles: readonly string[] | undefined): string => {
  if (!roles?.length) return '';
  const [first = '', ...rest] = roles;
  return rest.length ? `${roleLabel(first)} +${rest.length}` : roleLabel(first);
};

/**
 * Each of the user's roles with the consoles it opens. The server owns the
 * role → console map (`required_roles`), so this never restates it; SUPER_ADMIN
 * is the one role the server lets through every console.
 */
export const portalsByRole = (
  roles: readonly string[],
  portals: readonly PortalAccessEntry[]
): RolePortals[] =>
  roles.map((role) => ({
    role,
    portals: portals.filter(
      (portal) =>
        portal.has_access && (role === 'SUPER_ADMIN' || portal.required_roles.includes(role))
    ),
  }));
