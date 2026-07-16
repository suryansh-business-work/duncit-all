/**
 * Parses the comma-separated `VITE_REQUIRED_ROLES` override every portal's
 * `app-config.ts` duplicated: `parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['HR_MANAGER'])`.
 * Falls back to the portal's default roles when the env value yields nothing.
 */
export function parseEnvRoles(raw: unknown, fallback: string[] = []): string[] {
  const source = typeof raw === 'string' ? raw : '';
  const roles = source
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
  return roles.length ? roles : fallback;
}
