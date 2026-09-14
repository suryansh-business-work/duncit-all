/// <reference types="cypress" />
import { E2E_GOOGLE_CREDENTIAL_QUERY } from '@duncit/utils';

/**
 * Google's sign-in, stood in for.
 *
 * No automated browser gets through accounts.google.com, so the spec replaces
 * the one script `@react-oauth/google` loads — `https://accounts.google.com/gsi/client`
 * — with a stand-in for the calls the package makes on it (`google.accounts.id`
 * `initialize`, `renderButton`, `prompt`, `cancel`, `disableAutoSelect`, and the
 * `oauth2` clients). Its `renderButton` draws `google-stand-in` inside the app's
 * own `google-auth-button`; pressing it answers the app's callback exactly as
 * Google's popup would, with a credential this server minted for a run-account
 * address (`e2eGoogleCredential`). Everything after the popup — the server's
 * check, the policies, the WhatsApp step, the session — is the real thing.
 *
 * The credential is handed to the loaded page, never written into the script
 * or a logged command.
 */

/** Where the stand-in reads the credential from when it is pressed. */
const CREDENTIAL_KEY = '__duncitE2eGoogleCredential';

/** The names the minted credential carries — letters only, as a person's name must be. */
const GIVEN_NAME = 'Duncit';
const FAMILY_NAME = 'Google';

const CLIENT_CONFIG_QUERY = `query E2eGoogleClientConfig {
  publicClientConfig { google_client_id }
}`;

const GSI_STAND_IN = `(function () {
  var noop = function () {};
  var state = { callback: null, clientId: '' };
  var oauthClient = { requestAccessToken: noop, requestCode: noop };
  window.google = window.google || {};
  window.google.accounts = {
    id: {
      initialize: function (config) {
        state.callback = config.callback;
        state.clientId = config.client_id;
      },
      renderButton: function (parent) {
        if (!parent) return;
        var callback = state.callback;
        var clientId = state.clientId;
        var button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-testid', 'google-stand-in');
        button.textContent = 'Google';
        button.addEventListener('click', function () {
          if (callback) callback({ credential: window['${CREDENTIAL_KEY}'], select_by: 'btn', clientId: clientId });
        });
        parent.replaceChildren(button);
      },
      prompt: noop,
      cancel: noop,
      disableAutoSelect: noop,
      revoke: noop,
      storeCredential: noop
    },
    oauth2: {
      initTokenClient: function () { return oauthClient; },
      initCodeClient: function () { return oauthClient; },
      hasGrantedAllScopes: function () { return false; },
      hasGrantedAnyScope: function () { return false; },
      revoke: noop
    }
  };
})();`;

/** Serve the stand-in in place of Google's script. Register before the page loads. */
export function standInForGoogle(): void {
  cy.intercept(
    { method: 'GET', url: 'https://accounts.google.com/gsi/client*' },
    { statusCode: 200, headers: { 'content-type': 'application/javascript' }, body: GSI_STAND_IN },
  );
}

/** Google sign-in needs a client id on this server; without one the app draws a notice instead. */
export function expectGoogleConfigured(): void {
  cy.gql<{ publicClientConfig: { google_client_id: string | null } | null }>(CLIENT_CONFIG_QUERY, {}, { token: null }).then(
    (data) => {
      if (!data.publicClientConfig?.google_client_id) {
        throw new Error(
          'Staging prerequisite: publicClientConfig has no google_client_id (Tech portal, GOOGLE_OAUTH), so mWeb draws no Google button.',
        );
      }
    },
  );
}

/** A credential for `email`, as Google would return it after the popup. */
export const mintGoogleCredential = (email: string) =>
  cy
    .staffGql<{ e2eGoogleCredential: string }>(E2E_GOOGLE_CREDENTIAL_QUERY, {
      email,
      given_name: GIVEN_NAME,
      family_name: FAMILY_NAME,
    })
    .then((data) => data.e2eGoogleCredential);

/** Give the loaded page the credential the stand-in will answer with. */
export function handGoogleCredential(credential: string): void {
  cy.window({ log: false }).then((win) => {
    Reflect.set(win, CREDENTIAL_KEY, credential);
  });
}

/** Press "Sign in with Google" — the stand-in, inside the app's own Google button. */
export function pressGoogle(): void {
  cy.byTestId('google-auth-button', { timeout: 30_000 }).within(() => {
    cy.byTestId('google-stand-in').click();
  });
}
