import express, { Router } from 'express';

/**
 * Sign in with Apple for the doors that have no native Apple sheet — the
 * Android app, and the native app's web build.
 *
 * Apple's web flow only answers by POSTing a form to a registered https Return
 * URL whenever the name or email is asked for, and neither an app nor a Custom
 * Tab can receive a POST. So Apple posts HERE (`<server>/apple/callback`, listed
 * under the Services ID → Return URLs), and this hands the answer on with one
 * redirect to where the sign-in started, in the URL fragment so it never
 * reaches another server's logs. It verifies nothing and stores nothing: the
 * id_token is proved by `loginWithApple` / `signupWithApple` like any other.
 *
 * WHERE it redirects is the one thing to be careful with. `state` carries the
 * return address the client asked for; handing an id_token to an address an
 * attacker chose would hand them the account. So only the app's own scheme and
 * Duncit's own hosts are ever redirected to.
 */

/** The native app's URL scheme (app.json → expo.scheme): where the Android app waits. */
const APP_SCHEME = 'duncit:';

const isDuncitHost = (hostname: string) =>
  hostname === 'duncit.com' || hostname.endsWith('.duncit.com');

const isLocalHost = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';

/** The return address in `state`, when it is one of ours; null otherwise. */
function trustedReturnUrl(state: unknown): URL | null {
  if (typeof state !== 'string' || !state) return null;
  let url: URL;
  try {
    url = new URL(state);
  } catch {
    return null;
  }
  if (url.protocol === APP_SCHEME) return url;
  if (url.protocol === 'https:' && isDuncitHost(url.hostname)) return url;
  if (url.protocol === 'http:' && isLocalHost(url.hostname)) return url;
  return null;
}

/**
 * The name Apple posts on the FIRST authorisation only, as a JSON `user` field.
 * Carried on so signup does not have to ask for it.
 */
function sharedName(user: unknown): string {
  if (typeof user !== 'string' || !user) return '';
  try {
    const parsed = JSON.parse(user) as { name?: { firstName?: string; lastName?: string } };
    return [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(' ').trim();
  } catch {
    return '';
  }
}

export function buildAppleRelayRouter(): Router {
  const router = Router();

  router.post('/callback', express.urlencoded({ extended: false, limit: '32kb' }), (req, res) => {
    const back = trustedReturnUrl(req.body?.state);
    if (!back) {
      res.status(400).type('text/plain').send('Unknown return address.');
      return;
    }
    const answer = new URLSearchParams();
    const idToken = typeof req.body.id_token === 'string' ? req.body.id_token : '';
    if (idToken) {
      answer.set('id_token', idToken);
      const name = sharedName(req.body.user);
      if (name) answer.set('name', name);
    } else {
      // `user_cancelled_authorize` is the person closing Apple's page — the app
      // treats it as a cancel, not a failure.
      answer.set('error', typeof req.body.error === 'string' ? req.body.error : 'no_id_token');
    }
    back.hash = answer.toString();
    res.redirect(303, back.toString());
  });

  return router;
}
