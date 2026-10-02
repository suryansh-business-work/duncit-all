import { useEffect } from 'react';
import { AUTH_CHANGED_EVENT } from '../auth-events';
import type { DuncitUser } from '../types';

/**
 * Load fresh user data on mount (when already authed) AND whenever the auth
 * token flips in this tab. A portal logs in with a client-side navigation, so
 * without this the provider — mounted once above the router — would keep the
 * header/sidebar empty until a manual refresh. Also refresh after the tab
 * becomes visible again so a tab left open overnight reloads `me`.
 */
export function useAuthRefresh(
  isAuthedRef: { current: () => boolean },
  lastLoadedAtRef: { current: number },
  refetch: () => Promise<DuncitUser | null>,
) {
  useEffect(() => {
    // Initial load: only when this mount is already authed (refresh / return).
    if (isAuthedRef.current()) refetch().catch(() => undefined);

    // Auth flips in THIS tab (login sets / logout clears the token). `refetch`
    // itself short-circuits to clear the user when the new state is logged-out.
    const onAuthChanged = () => {
      refetch().catch(() => undefined);
    };
    globalThis.window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);

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

    return () => {
      globalThis.window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
