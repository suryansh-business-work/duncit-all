/**
 * Google's popup, stood in for on the native web export.
 *
 * The app signs in with expo-auth-session (`Google.useIdTokenAuthRequest`,
 * src/components/GoogleAuthButton). On web that opens accounts.google.com with
 * `window.open` and waits for the popup to post its redirect back to the opener
 * — expo-web-browser's `openAuthSessionAsync` accepts a trusted, same-origin
 * `message` whose `expoSender` is the request's `state`, then expo-auth-session
 * reads `id_token` and `state` out of the returned URL's query and fragment.
 *
 * No automated browser can pass Google's own page, so this answers in its
 * place: `window.open` hands back a popup that is never drawn, and the page is
 * sent the redirect Google would have sent, carrying a credential the server
 * under test minted for the run account (`e2eGoogleCredential`). Everything
 * after the popup — the app's handling, the server's verification, the session
 * — is the real thing.
 */

/** Long enough for the app to register its `message` listener after `window.open` returns. */
const REPLY_DELAY_MS = 300;

interface StandInPopup {
  closed: boolean;
  focus: () => void;
  close: () => void;
}

/** An `onBeforeLoad` for `cy.visitApp` that answers every Google sign-in with `credential`. */
export function googleStandIn(credential: string): (win: Cypress.AUTWindow) => void {
  return (win) => {
    const open = (url?: string | URL): StandInPopup => {
      const request = new URL(String(url));
      const state = request.searchParams.get('state') ?? '';
      const redirect = request.searchParams.get('redirect_uri') ?? win.location.origin;
      const answer = new URLSearchParams({ id_token: credential, state }).toString();
      const popup: StandInPopup = {
        closed: false,
        focus: () => undefined,
        close: () => {
          popup.closed = true;
        },
      };
      win.setTimeout(() => {
        win.postMessage({ url: `${redirect}#${answer}`, expoSender: state }, win.location.origin);
      }, REPLY_DELAY_MS);
      return popup;
    };
    win.open = open as unknown as typeof win.open;
  };
}
