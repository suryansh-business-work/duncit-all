import { emitAuthChanged } from '@duncit/user-context';
import { parseShortLinkParams, storedMemberShare } from '@duncit/utils';
import { redirectPathFromLocation } from '../utils/redirect';

/**
 * The two moments mWeb must send a visitor to the authentication page even
 * though this browser still holds a token.
 *
 * Both drop the credentials and NOTHING else. The account menu's logout wipes
 * storage whole, which is right when someone chooses to leave — but here the
 * same wipe would take the short-link click id with it, and that id is the
 * only record of the campaign this visit came from. Losing it means the signup
 * we are about to ask for is credited to nobody.
 */
const TOKEN_KEY = 'token';
const USER_CACHE_KEY = 'mweb_user';

function clearCredentials(): void {
  try {
    globalThis.localStorage.removeItem(TOKEN_KEY);
    globalThis.localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // Storage disabled: there was no session to end either.
  }
  // Tells the provider mounted above the router to drop the cached user now,
  // rather than at the next full page load.
  emitAuthChanged();
}

/** `/login`, carrying where the visitor was actually headed. */
function loginPathFor(target: string): string {
  return `/login?redirect=${encodeURIComponent(target)}`;
}

/**
 * The same address without its short-link markers.
 *
 * They are a one-time carrier — the capture has already turned them into a
 * stored click id — and leaving them on the address the visitor returns to
 * after signing in would make a plain page refresh look like a fresh short-link
 * landing and sign them straight back out.
 */
function withoutShortLinkParams(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete('dl');
  params.delete('dlc');
  params.delete('dls');
  const rest = params.toString();
  return rest ? `${pathname}?${rest}` : pathname;
}

/**
 * A landing that followed a MARKETING short link starts at sign-in, always.
 *
 * A marketing link is measured by the account it produces, and a session left
 * in this browser let the visit walk straight past that — home, pod, checkout,
 * all on somebody else's already-signed-in profile. The signed-OUT case needs
 * nothing here: `RequireAuth` already sends it to /login.
 *
 * A link a MEMBER shared is exempt. Every pod, club and profile handed out of
 * mWeb or the app is a short link now, so without that exemption opening a
 * link a friend sent would sign you out of your own account — and the visit is
 * already credited to the account it lands on, because the journey report is
 * sent authenticated.
 *
 * Runs at module scope in main.tsx, BEFORE React mounts, so the router's first
 * render is already the login route. The URL is rewritten in place rather than
 * reloaded: the landing capture fired a moment earlier and is still in flight,
 * and a reload would throw away the click id it is about to store.
 */
export function requireAuthForShortLinkLanding(): boolean {
  const { pathname, search } = globalThis.window.location;
  const { code, clickId, memberShare } = parseShortLinkParams(search);
  if (!code && !clickId) return false;
  // A landing that came through a link carries its own marker beside the code,
  // so the address is authoritative there. A hop that arrives with only a click
  // id — the outbound link decorator re-attaching it — has no marker, and the
  // fact remembered with that click stands in.
  if (memberShare || (!code && storedMemberShare())) return false;
  if (!globalThis.localStorage.getItem(TOKEN_KEY)) return false;

  clearCredentials();
  const target = withoutShortLinkParams(pathname, search);
  globalThis.window.history.replaceState(null, '', loginPathFor(target));
  return true;
}

/**
 * A token this browser holds that the server no longer accepts.
 *
 * `me` is only ever asked with a token attached and a transport failure throws
 * rather than answering null, so a null answer IS the token being rejected.
 * The shared provider deliberately keeps its cached user in that case, which is
 * right for a portal riding out a deploy blip — but on mWeb it left a rejected
 * session rendering the whole signed-in shell, profile and all, the length of
 * the booking flow, on a `me` the server had already refused.
 *
 * WHAT THIS ACTUALLY CATCHES: `signToken` mints Duncit JWTs with no `expiresIn`
 * — a session never times out — so the only ways here are a deleted or blocked
 * account, and a server whose JWT_SECRET no longer matches the one that signed
 * the token. The second rejects EVERY token at once, and this then signs every
 * visitor out rather than letting them ride out the misconfiguration. That is
 * the deliberate trade: a refused session must not look like a live one.
 *
 * Reloads rather than rewriting the URL, so every guard re-runs against the
 * cleared session. Safe to reload here: a landing that still carried short-link
 * markers was already sent to /login above and has no token left to reject.
 */
export function endRejectedSession(): void {
  const { pathname, search, hash } = globalThis.window.location;
  clearCredentials();
  globalThis.window.location.replace(
    loginPathFor(redirectPathFromLocation({ pathname, search, hash })),
  );
}
