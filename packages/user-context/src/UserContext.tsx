import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { clearAllStorages, readCachedUser, writeCachedUser, DEFAULT_STORAGE_KEY } from './storage';
import UserDataNotLoadedDialog from './UserDataNotLoadedDialog';
import type { DuncitUser } from './types';

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

const UserDataContext = createContext<UserDataContextValue | null>(null);

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

export function UserProvider({
  isAuthed,
  loadUser,
  onLogout,
  storageKey = DEFAULT_STORAGE_KEY,
  autoMountFailureDialog = true,
  children,
}: Readonly<UserProviderProps>) {
  // Hydrate from localStorage synchronously so refreshes don't flash a logged-out shell.
  const [userState, setUserState] = useState<DuncitUser | null>(() => readCachedUser(storageKey));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  // Flips true after the first load attempt completes (success or failure).
  // Required so `hasLoadFailure` doesn't trigger during initial mount before
  // the first `me` query has had a chance to run.
  const [loadAttempted, setLoadAttempted] = useState<boolean>(false);

  // Refs let `refetch` / `logout` stay stable across renders even though the
  // app-injected callbacks change identity each render.
  const loadUserRef = useRef(loadUser);
  loadUserRef.current = loadUser;
  const isAuthedRef = useRef(isAuthed);
  isAuthedRef.current = isAuthed;
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;
  // Timestamp of the last `me` load — used to throttle focus/visibility refreshes.
  const lastLoadedAtRef = useRef(0);

  const persist = useCallback(
    (next: DuncitUser | null) => {
      setUserState(next);
      writeCachedUser(next, storageKey);
    },
    [storageKey]
  );

  const refetch = useCallback(async () => {
    if (!isAuthedRef.current()) {
      persist(null);
      setError(null);
      setLoadAttempted(true);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const fresh = await loadUserRef.current();
      // Only overwrite the cache when we actually received a user. A `null`
      // means the server returned no user (token rejected, or a transient edge
      // during a deploy). We deliberately KEEP any cached user so an active
      // session is never yanked and the recovery dialog doesn't pop for a
      // momentary blip. A genuine sign-out goes through `logout()`, which
      // clears storage explicitly.
      if (fresh) persist(fresh);
      setError(null);
      return fresh;
    } catch (e) {
      // Network/transport failure (e.g. the 502 window while the API container
      // restarts during a deploy). The Apollo RetryLink has already retried
      // before this throw, so treat it as transient: keep the cached user and
      // record the error only — the recovery dialog stays hidden as long as a
      // cached user exists.
      setError(e instanceof Error ? e : new Error(String(e)));
      return null;
    } finally {
      setLoading(false);
      setLoadAttempted(true);
      lastLoadedAtRef.current = Date.now();
    }
  }, [persist]);

  const update = useCallback<UserDataContextValue['update']>(
    (patch) => {
      setUserState((current) => {
        let next: DuncitUser | null;
        if (typeof patch === 'function') {
          next = (patch as (c: DuncitUser | null) => DuncitUser | null)(current);
        } else if (current) {
          next = { ...current, ...patch };
        } else {
          next = { ...patch } as DuncitUser;
        }
        writeCachedUser(next, storageKey);
        return next;
      });
    },
    [storageKey]
  );

  const setUser = useCallback(
    (next: DuncitUser | null) => {
      persist(next);
    },
    [persist]
  );

  const reloadApp = useCallback(() => {
    if (typeof globalThis.window !== 'undefined') window.location.reload();
  }, []);

  const logout = useCallback(() => {
    clearAllStorages();
    setUserState(null);
    setError(null);
    if (onLogoutRef.current) {
      onLogoutRef.current();
    } else if (typeof globalThis.window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  // On mount and whenever the auth state flips on, load fresh user data.
  // Refresh after a focus event so a tab left open overnight reloads `me`
  // when the user returns — keeps roles / profile_photo current.
  useEffect(() => {
    if (!isAuthed()) return;
    refetch().catch(() => undefined);
    // Refresh `me` when the user RETURNS to a tab that's been hidden for a while
    // (e.g. left open overnight) so roles / profile stay current. Uses
    // visibilitychange — NOT window 'focus', which mobile taps fire constantly —
    // and throttles to once per 5 min so ordinary clicks never re-hit the API.
    const MIN_REFRESH_MS = 5 * 60 * 1000;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!isAuthedRef.current()) return;
      if (Date.now() - lastLoadedAtRef.current < MIN_REFRESH_MS) return;
      refetch().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasLoadFailure = useMemo(
    // Fire only when authed, the first load attempt has finished, and we have
    // NO user at all — neither fresh nor cached. Because `refetch` keeps the
    // cached user on every failure (null or network error), this is now limited
    // to the genuinely-stuck case: a brand-new session whose very first `me`
    // could not be loaded even after RetryLink exhausted its retries. An active
    // session with a cached user never trips this, so the recovery dialog stays
    // hidden during deploys / transient blips.
    () => isAuthed() && !loading && loadAttempted && !userState,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, userState, loadAttempted]
  );

  const value = useMemo<UserDataContextValue>(
    () => ({
      user: userState,
      loading,
      error,
      refetch,
      update,
      setUser,
      logout,
      hasLoadFailure,
      reloadApp,
    }),
    [userState, loading, error, refetch, update, setUser, logout, hasLoadFailure, reloadApp]
  );

  return (
    <UserDataContext.Provider value={value}>
      {children}
      {autoMountFailureDialog && (
        <UserDataNotLoadedDialog
          open={hasLoadFailure}
          errorMessage={error?.message}
          onReload={reloadApp}
          onLogout={logout}
        />
      )}
    </UserDataContext.Provider>
  );
}

export function useUserData<T = DuncitUser>(): UserDataContextValue<T> {
  const ctx = useContext(UserDataContext);
  if (!ctx) {
    throw new Error('useUserData must be used inside a <UserProvider>');
  }
  return ctx as unknown as UserDataContextValue<T>;
}
