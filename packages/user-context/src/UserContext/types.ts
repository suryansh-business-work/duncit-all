import type { ReactNode } from 'react';
import type { DuncitUser } from '../types';

export interface UserDataContextValue<T = DuncitUser> {
  user: T | null;
  loading: boolean;
  error: Error | null;
  /** Re-runs `loadUser`; refreshes both the in-memory state and the localStorage cache. */
  refetch: () => Promise<T | null>;
  /** Local-only merge. Persists the patched user to localStorage. Does NOT call the server. */
  update: (patch: Partial<T> | ((current: T | null) => T | null)) => void;
  /** Replaces the user wholesale (e.g. after login). Pass null to clear without redirecting. */
  setUser: (user: T | null) => void;
  /** Clears all localStorage + sessionStorage and redirects to the login page. */
  logout: () => void;
  /** True when authed (token present) but the server-side user could not be loaded. */
  hasLoadFailure: boolean;
  /** Force-reload the page (used by the recovery dialog). */
  reloadApp: () => void;
}

export interface UserProviderProps {
  /** Returns true if the app currently has an auth token. Determines whether to load `me`. */
  isAuthed: () => boolean;
  /** App-specific fetcher. Typically wraps an Apollo `me { ... }` query. Return `null` when no user is available. */
  loadUser: () => Promise<DuncitUser | null>;
  /** Path or callback to navigate to after logout. Defaults to `window.location.href = '/login'`. */
  onLogout?: () => void;
  /** Override the localStorage key used to cache the user object. Defaults to `duncit_user`. */
  storageKey?: string;
  /**
   * Whether the recovery dialog should be auto-rendered by this provider. Defaults to true.
   * Set false if an app wants to render the dialog itself in a custom position.
   */
  autoMountFailureDialog?: boolean;
  children: ReactNode;
}
