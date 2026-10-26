/// <reference types="cypress" />
import { AUTH_REQUIRED, expectRefused, signInRunMember } from '../../../support/access-steps';
import { runAccount } from '../../../support/run-account';

/**
 * Sign out of all devices — the only way a Duncit session ends, because the
 * JWTs themselves never expire (server/src/modules/access/auth/session-seal.ts).
 * `signOutEverywhere` stamps security.sessions_invalidated_at and seals the
 * account in this process at once (sign-out-everywhere.ts); every request whose
 * token was issued before that instant is then treated as signed out
 * (server/src/context.ts:78). Scenario map: Other › Auth (sessions).
 *
 * Only the run account's own sessions are sealed, and the spec signs in again
 * at the end so whatever runs next starts from a live session.
 */

const CONNECTED = 'query E2eSessionConnected { myConnectedAccounts { __typename } }';
const ME = 'query E2eSessionMe { me { roles } }';
const SIGN_OUT_EVERYWHERE = 'mutation E2eSignOutEverywhere { signOutEverywhere }';
/** `iat` is whole seconds: a token minted in the seal's own second would count as before it. */
const PAST_THE_SEAL_MS = 1100;

describe('API · Sign out of all devices ends every existing token', { testIsolation: false }, () => {
  const account = runAccount();
  let first = '';
  let second = '';

  before(() => {
    signInRunMember().then((token) => {
      first = token;
    });
    // A second device: another sign-in of the same account.
    cy.wait(PAST_THE_SEAL_MS);
    cy.apiLogin(account.email, account.password('CHANGED')).then((token) => {
      second = token;
    });
  });

  it('SE-01 both devices start signed in', () => {
    [first, second].forEach((token) => {
      cy.gqlRaw(CONNECTED, {}, { token }).then((body) => {
        expect(body.errors, 'a live session reads its own accounts').to.be.undefined;
        expect(body.data?.myConnectedAccounts).to.exist;
      });
    });
  });

  it('SE-02 signOutEverywhere refuses a signed-out caller', () => {
    cy.gqlRaw(SIGN_OUT_EVERYWHERE, {}, { token: null }).then((body) =>
      expectRefused('signOutEverywhere', body, AUTH_REQUIRED),
    );
  });

  it("SE-03 signing out everywhere from one device ends the other device's token", () => {
    cy.gql<{ signOutEverywhere: boolean }>(SIGN_OUT_EVERYWHERE, {}, { token: first }).then((data) => {
      expect(data.signOutEverywhere).to.equal(true);
    });
    cy.gqlRaw(CONNECTED, {}, { token: second }).then((body) =>
      expectRefused('myConnectedAccounts', body, AUTH_REQUIRED),
    );
  });

  it('SE-04 the device that pressed it is signed out too, and reads as nobody', () => {
    cy.gqlRaw(CONNECTED, {}, { token: first }).then((body) => expectRefused('myConnectedAccounts', body, AUTH_REQUIRED));
    cy.gqlRaw(ME, {}, { token: first }).then((body) => {
      expect(body.errors).to.be.undefined;
      expect(body.data?.me, 'a sealed token is no one').to.be.null;
    });
  });

  it('SE-05 a fresh sign-in after the seal works', () => {
    cy.wait(PAST_THE_SEAL_MS);
    cy.apiLogin(account.email, account.password('CHANGED')).then((token) => {
      cy.gqlRaw(CONNECTED, {}, { token }).then((body) => {
        expect(body.errors, 'the new session is live').to.be.undefined;
        expect(body.data?.myConnectedAccounts).to.exist;
      });
    });
  });
});
