import type { DuncitUser } from '@duncit/user-context';

/** The signed-in account as the chrome receives it (may not be loaded yet). */
export type ShellUser = DuncitUser | null | undefined;

/** Display name for the signed-in user, falling back to the portal name. */
export const accountName = (user: ShellUser, fallback: string): string =>
  user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || fallback;

export const accountEmail = (user: ShellUser): string => user?.email ?? '';

/** 1–2 letter avatar initials derived from the display name. */
export const initials = (user: ShellUser, fallback: string): string => {
  const name = accountName(user, fallback);
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || fallback.charAt(0)
  );
};
