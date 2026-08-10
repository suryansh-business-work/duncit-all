import { useEffect } from 'react';
import { subscribeUserChanged, type SocketLike } from '@duncit/user-core';

/**
 * Builds the socket for this surface, reading whatever token that app stores.
 *
 * Returns null when the app has no real-time transport configured, or when it
 * is not authed — the session still works, it just refreshes on its own
 * schedule instead.
 */
export type SessionSocketFactory = () => SocketLike | null;

let factory: SessionSocketFactory | null = null;

/**
 * Tell the session layer how to open a socket.
 *
 * Called once during boot (mWeb's `main.tsx`, `mountPortal`). It is a module
 * setter rather than a provider prop because `UserProvider` is mounted by 20
 * apps, and threading a new required prop through all of them to reach the two
 * that configure it is churn for nothing.
 */
export function configureSessionSocket(next: SessionSocketFactory | null): void {
  factory = next;
}

/**
 * Keep this tab's session in step with the account's other surfaces.
 *
 * The server emits `user:changed` from every mutation that moves a
 * session-visible field, so a name edited on the phone lands in the portal
 * header without a refresh — which is the whole point of a shared context.
 *
 * The patch is applied locally rather than triggering a refetch: the frame
 * already carries the new values, and a refetch per keystroke on the profile
 * form would be a request storm for data the client was just handed.
 */
export function useUserRealtime(
  userId: string | null | undefined,
  apply: (patch: Record<string, unknown>) => void,
): void {
  useEffect(() => {
    if (!userId || !factory) return undefined;
    const socket = factory();
    if (!socket) return undefined;
    const unsubscribe = subscribeUserChanged(socket, userId, apply);
    return () => {
      unsubscribe();
      // This effect OWNS the connection it opened. Without the disconnect a
      // token refresh or a sign-out would leave the old socket attached and the
      // account would accumulate one connection per re-auth.
      socket.disconnect?.();
    };
    // `apply` comes from a useCallback in the provider and is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
