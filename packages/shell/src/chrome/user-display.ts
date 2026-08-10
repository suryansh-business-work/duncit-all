import {
  accountEmail as coreEmail,
  accountName as coreName,
  initials as coreInitials,
  normalizeMe,
} from '@duncit/user-core';
import type { DuncitUser } from '@duncit/user-context';

/** The signed-in account as the chrome receives it (may not be loaded yet). */
export type ShellUser = DuncitUser | null | undefined;

/**
 * The chrome's display helpers, delegating to `@duncit/user-core`.
 *
 * They keep the `fallback` parameter — the portal's short name, which the core
 * has no business knowing — but the derivation itself is shared, so a header,
 * a user menu and a profile page cannot disagree about what one account is
 * called. The initials now come from first + last name rather than the first
 * two words of the display name, which is the same answer for "Asha Rao" and a
 * better one for "Asha Kumari Rao".
 */
export const accountName = (user: ShellUser, fallback: string): string =>
  coreName(normalizeMe(user), fallback);

export const accountEmail = (user: ShellUser): string => coreEmail(normalizeMe(user));

/** 1–2 letter avatar initials. */
export const initials = (user: ShellUser, fallback: string): string =>
  coreInitials(normalizeMe(user), fallback);
