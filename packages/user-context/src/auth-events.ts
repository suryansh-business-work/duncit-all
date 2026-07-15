/**
 * Same-tab auth-change signal.
 *
 * A portal logs in with a client-side navigation (no page reload), so the
 * `UserProvider` — mounted once above the router — never re-runs its initial
 * load and the header/sidebar stay empty until a manual refresh. The shared
 * session helpers fire this event whenever the token is set or cleared, letting
 * the provider reload (or clear) the current user immediately.
 *
 * `storage` events only fire in OTHER tabs, so they cannot cover the same-tab
 * login — hence this explicit event.
 */
export const AUTH_CHANGED_EVENT = 'duncit:auth-changed';

/** Notify this tab that the auth token was set or cleared (login / logout). */
export function emitAuthChanged(): void {
  if (typeof globalThis.window !== 'undefined') {
    globalThis.window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}
