/// <reference types="cypress" />
import { AUTH_REQUIRED, expectRefused, signInRunMember } from '../../../support/access-steps';
import { firstError } from '../../../support/api-other';

/**
 * Turning authenticator sign-in off needs a session and a code — the server
 * refuses it before reading any secret (server/src/modules/access/auth:
 * auth.resolver.ts `disableTwoFactor` → requireUserId, the code validator,
 * then two-factor.service.ts `disable`). Scenario map: Other › Auth (2FA)
 * ("Disable 2FA requires a current code").
 *
 * The run account never turns 2FA on, so these are the refusals it can reach;
 * a wrong code against an ENABLED authenticator needs a TOTP secret the suite
 * does not hold (see the run report).
 */

const DISABLE = `mutation E2eDisableTwoFactor($code: String!) {
  disableTwoFactor(code: $code) { __typename }
}`;
const CONNECTED = 'query E2eTwoFactorState { myConnectedAccounts { __typename } }';

describe('API · Disabling 2FA is refused without a session or a valid code', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('TF-01 a signed-out caller is refused before any code is looked at', () => {
    cy.gqlRaw(DISABLE, { code: '000000' }, { token: null }).then((body) =>
      expectRefused('disableTwoFactor', body, AUTH_REQUIRED),
    );
  });

  it('TF-02 a code shorter than six characters fails validation', () => {
    cy.gqlRaw(DISABLE, { code: '123' }, { token: memberToken }).then((body) => {
      const error = firstError(body, 'a short code');
      expect(error.code).to.equal('BAD_USER_INPUT');
      expect(error.message).to.equal('Validation failed');
      expect(body.data?.disableTwoFactor ?? null).to.be.null;
    });
  });

  it('TF-03 an account without 2FA is told it is not on, and nothing changes', () => {
    cy.gqlRaw(DISABLE, { code: '000000' }, { token: memberToken }).then((body) => {
      const error = firstError(body, 'disabling 2FA that is off');
      expect(error.code).to.equal('BAD_USER_INPUT');
      expect(error.message).to.equal('Authenticator app sign-in is not on.');
      expect(body.data?.disableTwoFactor ?? null).to.be.null;
    });
    // The session the refusal was made on is untouched.
    cy.gqlRaw(CONNECTED, {}, { token: memberToken }).then((body) => {
      expect(body.errors).to.be.undefined;
      expect(body.data?.myConnectedAccounts).to.exist;
    });
  });
});
