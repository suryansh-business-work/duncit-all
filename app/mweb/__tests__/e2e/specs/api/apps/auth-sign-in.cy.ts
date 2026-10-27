/// <reference types="cypress" />
import { expectRefused, type Refusal } from '../../../support/access-steps';
import { runAccount } from '../../../support/run-account';

/**
 * Sign-in refused by the server — the API half of Apps › Auth - Sign in
 * ("Password sign-in refused by the server"). A wrong password and an address
 * with no account must get the SAME answer, so the sign-in screen can never be
 * used to find out who has an account (user.auth.ts `invalidCredentials`).
 * The run's traffic key rides on every request (support/e2e.ts), so these
 * attempts are not counted against the sign-in rate limit.
 */

const INVALID: Refusal = { code: 'UNAUTHENTICATED', message: 'Invalid email or password' };

const LOGIN = `mutation E2eLoginRefusal($input: LoginInput!) { login(input: $input) { token } }`;

describe('API · Sign-in is refused alike for a wrong password and an unknown address', () => {
  const account = runAccount();

  it('AS-01 the right password signs the run account in', () => {
    cy.gql<{ login: { token: string } }>(
      LOGIN,
      { input: { email: account.email, password: account.password('CHANGED') } },
      { token: null },
    ).then(({ login }) => {
      expect(login.token).to.be.a('string').and.not.be.empty;
    });
  });

  it('AS-02 a wrong password is refused with the generic message and no token', () => {
    cy.gqlRaw(
      LOGIN,
      { input: { email: account.email, password: `${account.password('CHANGED')}-wrong` } },
      { token: null },
    ).then((body) => expectRefused('login', body, INVALID));
  });

  it('AS-03 an address with no account gets exactly the same answer', () => {
    // A run address no spec ever signs up, so it can never exist on the server.
    cy.gqlRaw(
      LOGIN,
      { input: { email: account.address('nobody'), password: account.password('CHANGED') } },
      { token: null },
    ).then((body) => expectRefused('login', body, INVALID));
  });

  it('AS-04 the password the account had before it was changed no longer works', () => {
    cy.gqlRaw(LOGIN, { input: { email: account.email, password: account.password('RECOVERED') } }, { token: null }).then(
      (body) => expectRefused('login', body, INVALID),
    );
  });
});
