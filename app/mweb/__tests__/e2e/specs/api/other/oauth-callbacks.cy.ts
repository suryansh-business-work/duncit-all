/// <reference types="cypress" />
import { forgedSignedLink, rest } from '../../../support/api-other';

/**
 * The two OAuth callbacks the server's background mail and social jobs are
 * connected through:
 *
 * - GET /gmail/oauth/callback (platform/mailAutomation/mailAutomation.router.ts)
 *   returns the operator to <Tech>/mail-automation with `connected=` or `error=`.
 *   Scenario map: Server › Mail automation (Gmail) — "Connect a mailbox via
 *   OAuth callback" (Cancel → error=access_denied, no code or state →
 *   error=missing_code).
 * - GET /social/callback (crm/marketing/social/social.router.ts) returns the
 *   marketer to <Marketing>/social-accounts with `connected=` or
 *   `social_error=`. Scenario map: Server › Social accounts sync, publishing and
 *   OAuth — "Social account OAuth callback connects the account" (Cancel,
 *   forged state, no code).
 *
 * Both must refuse a state this server did not sign before any code reaches
 * Google or a social network, and both send the browser to a page fixed by
 * config — never to an address taken from the request. Approving a real
 * connection needs a person at the provider's consent screen, so the
 * happy path is not driven here.
 */

interface Landing {
  url: URL;
}

/** Follow nothing: read where the callback sends the browser. */
function landing(path: string, qs: Record<string, string> = {}): Cypress.Chainable<Landing> {
  return rest('GET', path, { qs }).then((res) => {
    expect(res.status, `${path} redirects`).to.equal(302);
    const location = String(res.headers.location ?? '');
    expect(location, `${path} Location`).to.match(/^https?:\/\//);
    return { url: new URL(location) };
  });
}

/** A callback's redirect lands on `pathname` of one fixed host and carries `param=value`. */
function expectLanding(path: string, qs: Record<string, string>, pathname: string, param: string, value: string): void {
  landing(path, qs).then(({ url }) => {
    expect(url.pathname, 'lands on the console page that started the connection').to.equal(pathname);
    expect(url.searchParams.get(param), param).to.equal(value);
    expect([...url.searchParams.keys()], 'nothing claims a connection').not.to.include('connected');
  });
}

const EVIL = 'https://evil.example/steal';
const REDIRECT_BAIT = { redirect_uri: EVIL, return_to: EVIL, next: EVIL };

describe('API · OAuth callbacks refuse anything they did not start', { testIsolation: false }, () => {
  const GMAIL = '/gmail/oauth/callback';
  const SOCIAL = '/social/callback';

  it('OC-01 Gmail: no code or state lands on Mail automation with error=missing_code', () => {
    expectLanding(GMAIL, {}, '/mail-automation', 'error', 'missing_code');
    expectLanding(GMAIL, { code: 'e2e-code' }, '/mail-automation', 'error', 'missing_code');
  });

  it('OC-02 Gmail: Cancel on the consent screen comes back as error=access_denied', () => {
    expectLanding(GMAIL, { error: 'access_denied' }, '/mail-automation', 'error', 'access_denied');
  });

  it('OC-03 Gmail: a state this server never signed is refused before the code is exchanged', () => {
    expectLanding(
      GMAIL,
      { code: 'e2e-code', state: forgedSignedLink() },
      '/mail-automation',
      'error',
      'This connect link has expired. Start again from the Tech portal.',
    );
  });

  it('OC-04 Social: no code lands on Social Accounts with social_error=missing_code', () => {
    expectLanding(SOCIAL, {}, '/social-accounts', 'social_error', 'missing_code');
    expectLanding(SOCIAL, { code: 'e2e-code' }, '/social-accounts', 'social_error', 'missing_code');
  });

  it('OC-05 Social: the network\'s own error (Cancel) is passed back as social_error', () => {
    expectLanding(SOCIAL, { error: 'access_denied' }, '/social-accounts', 'social_error', 'access_denied');
  });

  it('OC-06 Social: a forged state is refused and lands on Social Accounts', () => {
    expectLanding(
      SOCIAL,
      { code: 'e2e-code', state: forgedSignedLink() },
      '/social-accounts',
      'social_error',
      'This connect link has expired or did not start here. Press Connect again.',
    );
  });

  it('OC-07 neither callback can be made into an open redirect', () => {
    [GMAIL, SOCIAL].forEach((path) => {
      landing(path).then((plain) => {
        landing(path, REDIRECT_BAIT).then((baited) => {
          expect(baited.url.host, `${path} host is fixed by config`).to.equal(plain.url.host);
          expect(baited.url.host).not.to.equal('evil.example');
          expect(baited.url.pathname).to.equal(plain.url.pathname);
        });
        landing(path, { ...REDIRECT_BAIT, code: 'e2e-code', state: forgedSignedLink() }).then((baited) => {
          expect(baited.url.host, `${path} host with a forged state`).to.equal(plain.url.host);
        });
      });
    });
  });
});
