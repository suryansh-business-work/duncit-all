/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { rest } from '../../../support/api-other';
import { runAccount } from '../../../support/run-account';

/**
 * Notification SSE — `GET /notifications/stream?token=` (server/src/index.ts
 * ~938). EventSource cannot send headers, so the JWT rides in the query string
 * and anything that does not verify is answered 401 with an empty body before
 * a single event is written. Scenario map: Other › Notification SSE.
 *
 * A VALID token is never sent here: the stream then stays open for good, and a
 * `cy.request` would only end at its timeout.
 */

const STREAM = '/notifications/stream';
/** Short: a refusal is immediate, and an opened stream must fail fast rather than hang. */
const REFUSAL_TIMEOUT_MS = 10_000;

const expectRefused = (token: string | null) =>
  rest('GET', STREAM, { qs: token === null ? {} : { token }, timeout: REFUSAL_TIMEOUT_MS }).then((res) => {
    expect(res.status).to.equal(401);
    expect(res.headers['content-type'] ?? '', 'no event stream was opened').not.to.include('text/event-stream');
    expect(res.body).to.be.oneOf(['', undefined, null]);
  });

const SIGN_OUT_EVERYWHERE = 'mutation E2eSseSignOutEverywhere { signOutEverywhere }';

describe('API · The notification stream refuses callers it cannot verify', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('NS-01 no token is refused with 401', () => {
    expectRefused(null);
  });

  it('NS-02 a token that is not a JWT is refused with 401', () => {
    expectRefused('not-a-token');
  });

  it("NS-03 the member's own token with its signature broken is refused with 401", () => {
    const forged = `${memberToken.slice(0, -4)}${memberToken.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA'}`;
    expectRefused(forged);
  });

  // The stream authenticates through decodeAuthUser, like every GraphQL request
  // (notification.stream.ts), so a token sealed by "Sign out of all devices" or a
  // password reset no longer opens it.
  it('NS-04 a token sealed by "sign out everywhere" is refused with 401', () => {
    const account = runAccount();
    cy.gql(SIGN_OUT_EVERYWHERE, {}, { token: memberToken });
    expectRefused(memberToken);
    // A new session for the specs that follow (iat is in seconds: wait out the seal's second).
    cy.wait(1100);
    cy.apiLogin(account.email, account.password('CHANGED'));
  });
});
