import { useCallback, useMemo, useRef, useState } from 'react';
import { clearAllStorages, readCachedUser, writeCachedUser, DEFAULT_STORAGE_KEY } from '../storage';
import { useUserRealtime } from '../useUserRealtime';
import UserDataNotLoadedDialog from '../UserDataNotLoadedDialog';
import type { DuncitUser } from '../types';
import type { UserDataContextValue, UserProviderProps } from './types';
import { UserDataContext } from './useUserData';
import { useAuthRefresh } from './useAuthRefresh';

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
      // The finally's exception-propagation entry is unreachable: the catch above
      // handles every rejection and never rethrows, so v8 can't exercise that path.
      /* v8 ignore next */
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
    if (globalThis.window !== undefined) globalThis.window.location.reload();
  }, []);

  const logout = useCallback(() => {
    clearAllStorages();
    setUserState(null);
    setError(null);
    if (onLogoutRef.current) {
      onLogoutRef.current();
    } else if (globalThis.window !== undefined) {
      globalThis.window.location.href = '/login';
    }
  }, []);

  useAuthRefresh(isAuthedRef, lastLoadedAtRef, refetch);

  // Real-time: a profile change made on any of this account's other surfaces
  // (the phone, another portal tab) lands here without a refetch. `update`
  // already persists to the cache, so a reload keeps what the socket delivered.
  //
  // The same connection also carries the account's ending — its owner asked
  // for it to be deleted from another device, and the server has already
  // stopped accepting this tab's token. `logout` clears the cached user too,
  // which matters here: without it the shell would keep rendering a signed-in
  // header off storage for a session the server has finished with.
  useUserRealtime(userState?.user_id, update, logout);

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
