import { useMemo } from 'react';
import {
  accountEmail,
  accountName,
  can as canRoles,
  canAny as canAnyRoles,
  initials as deriveInitials,
  normalizeMe,
  type SessionSnapshot,
} from '@duncit/user-core';
import { useDeviceInfo, useUserData } from '@duncit/user-context';
import { useFeatureFlags } from './useFeatureFlag';

export interface SessionValue extends SessionSnapshot {
  loading: boolean;
  error: Error | null;
  /** Re-read `me` from the server. */
  refetch: () => Promise<unknown>;
  /** Clear the session and leave for the login page. */
  logout: () => void;
}

/**
 * The one hook every web surface reads the session through — mWeb and all 17
 * portals, matching the native app's `useSession()`.
 *
 * `useUserData()` still exists and still returns the raw `me`, so a page that
 * needs a field outside the shared shape (saved pods, the follow graph) reads
 * it there. This is for the question nearly every call site actually asks: who
 * is signed in, on what device, with which roles and flags.
 *
 * The derivations are the point. `accountName`, `initials` and the role checks
 * were re-implemented per portal, each with its own idea of what to do when
 * `last_name` is empty or `roles` is null — so one account rendered as "AS" in
 * one header, "A" in another and "U" in a third.
 *
 * It lives here rather than in `@duncit/user-context` because the flags come
 * from this package and `@duncit/app-settings` already depends on user-context;
 * the other direction would be a cycle.
 */
export function useSession(): SessionValue {
  const { user: raw, loading, error, refetch, logout } = useUserData();
  const device = useDeviceInfo();
  const flags = useFeatureFlags();

  return useMemo(() => {
    const user = normalizeMe(raw);
    const roles = user?.roles ?? [];
    let status: SessionSnapshot['status'] = 'anonymous';
    if (user) status = 'authenticated';
    else if (loading) status = 'loading';
    else if (error) status = 'failed';

    return {
      status,
      user,
      device,
      flags,
      isAuthenticated: !!user,
      roles,
      name: accountName(user),
      initials: deriveInitials(user),
      email: accountEmail(user),
      can: (...needed: string[]) => canRoles(roles, ...needed),
      canAny: (...needed: string[]) => canAnyRoles(roles, ...needed),
      hasFlag: (key: string) => flags[key] === true,
      loading,
      error,
      refetch,
      logout,
    };
  }, [raw, device, flags, loading, error, refetch, logout]);
}
