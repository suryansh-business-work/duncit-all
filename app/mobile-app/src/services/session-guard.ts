import { useAppPopupStore } from '@/stores/app-popup.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCoinBalanceStore, useCoinLedgerStore } from '@/stores/coin.store';

/**
 * Ending a session, as a plain function — the RN twin of mWeb's
 * `lib/session-guard.ts` (rule 27).
 *
 * It lives outside `useLogout` because a session does not only end when
 * somebody presses Log out. It also ends when the SERVER decides it has: an
 * account whose owner asked for it to be deleted stops being accepted from
 * every device at once, and this phone finds out either from a socket frame or
 * from the first `me` that answers null. Those two paths cannot be hooks, and
 * three copies of "which stores hold per-account data" is exactly how one of
 * them ends up leaking a balance into the next person to sign in.
 *
 * `me.store` is reset by its callers rather than here, so this module can be
 * imported BY that store without the two importing each other.
 */
export async function endSession(): Promise<void> {
  // Unbind the device push token before dropping the bearer token, or the
  // phone keeps receiving this account's notifications after it is signed out.
  await useAuthStore.getState().signOut();
  // The coin balance is per-account money, so it must not survive the session
  // and flash in the next user's sidebar while their own balance loads.
  useCoinBalanceStore.getState().reset();
  useCoinLedgerStore.getState().reset();
  // Which popups somebody has already closed is per-account, so the cached
  // answer must not decide what the NEXT user who signs in on this phone sees.
  useAppPopupStore.getState().reset();
}

/**
 * A token this phone holds that the server no longer accepts.
 *
 * `me` is only ever asked with a token attached and a transport failure throws
 * rather than answering null, so a null answer IS the token being rejected.
 *
 * WHAT THIS ACTUALLY CATCHES: `signToken` mints Duncit JWTs with no `expiresIn`
 * — a session never times out — so the only ways here are a deleted account,
 * one sealed by a deletion request filed on another device, a blocked account,
 * and a server whose JWT_SECRET no longer matches the one that signed the
 * token. The last rejects EVERY token at once and this then signs everybody
 * out rather than letting them ride out the misconfiguration. That is the
 * deliberate trade, and it is the one mWeb already makes: a refused session
 * must not look like a live one.
 *
 * Dropping the token flips the navigation gate back to the auth group, so no
 * imperative navigation is needed here.
 */
export function endRejectedSession(): void {
  endSession().catch(() => undefined);
}
