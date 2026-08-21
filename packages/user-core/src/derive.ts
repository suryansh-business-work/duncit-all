import type { SessionUser } from './types';

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const strOrNull = (value: unknown): string | null => {
  const s = str(value);
  return s || null;
};
const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).filter(Boolean) : [];

/**
 * Raw `me` → the session shape, with every empty-vs-null trap flattened once.
 *
 * The server's `toPublic` is inconsistent about this by design (legacy dual
 * writes): `email` can be null, `city` can be '' or null, `roles` can be
 * absent. Every surface used to guess. This is the one place that decides.
 */
export function normalizeMe(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const me = raw as Record<string, unknown>;
  const userId = str(me.user_id);
  // No id, no session. An object without one is a malformed answer, not an
  // anonymous user — and returning it is how `meId=''` spread through the shell.
  if (!userId) return null;

  const first = str(me.first_name);
  const last = str(me.last_name);
  return {
    user_id: userId,
    first_name: first,
    last_name: last,
    full_name: str(me.full_name) || `${first} ${last}`.trim(),
    email: strOrNull(me.email),
    phone_number: str(me.phone_number),
    phone_extension: str(me.phone_extension),
    avatar: strOrNull(me.profile_photo),
    bio: strOrNull(me.bio),
    roles: list(me.roles),
    locale: str(me.locale) || 'en-IN',
    timezone: str(me.timezone),
    country: str(me.country) || 'India',
    city: strOrNull(me.city),
    state: strOrNull(me.state),
    zone: strOrNull(me.zone),
    assigned_city: strOrNull(me.assigned_city),
    assigned_zones: list(me.assigned_zones),
    selected_location_id: strOrNull(me.selected_location_id),
    is_email_verified: me.is_email_verified === true,
    is_phone_verified: me.is_phone_verified === true,
    // Absent means "not answered yet", which is what the survey flow expects —
    // only an explicit false should route someone back into it.
    onboarding_survey_completed: me.onboarding_survey_completed !== false,
    created_at: strOrNull(me.created_at),
    updated_at: strOrNull(me.updated_at),
  };
}

/** Display name, never empty. */
export const accountName = (user: SessionUser | null, fallback = 'User'): string =>
  user?.full_name || user?.first_name || user?.email || fallback;

/** Display email, never empty. */
export const accountEmail = (user: SessionUser | null, fallback = ''): string =>
  user?.email ?? fallback;

/** Avatar initials — one or two letters, always upper case. */
export function initials(user: SessionUser | null, fallback = 'U'): string {
  const from = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.trim();
  if (from) return from.toUpperCase();
  const name = accountName(user, '');
  return (name[0] ?? fallback).toUpperCase();
}

/**
 * May this account open a portal that requires one of `required`?
 *
 * Empty `required` means the surface is open to any signed-in account — that is
 * how mWeb and the native app use it, and it must not be read as "nobody".
 */
export function hasAppAccess(roles: string[], required: readonly string[]): boolean {
  if (required.length === 0) return true;
  return roles.some((role) => required.includes(role));
}

/**
 * Does this account hold every one of `needed`?
 *
 * Roles ARE the authorisation model here — the server gates on `requireRole`
 * and there is no permission collection, so inventing a second vocabulary
 * client-side would let the two disagree. `can` reads as a permission check and
 * resolves to the roles the server actually enforces.
 */
export const can = (roles: string[], ...needed: string[]): boolean =>
  needed.every((role) => roles.includes(role));

/** Does this account hold ANY of `needed`? */
export const canAny = (roles: string[], ...needed: string[]): boolean =>
  needed.some((role) => roles.includes(role));
