/// <reference types="cypress" />
import { rest, serverOrigin, textOf } from '../../../support/api-other';

/**
 * Sign in with Apple's form_post relay, POST /apple/callback
 * (server/src/modules/access/auth/apple.relay.ts). Apple posts the id_token
 * here and the relay hands it on with ONE 303 redirect to the address in
 * `state`, inside the URL fragment. Handing a token to an address an attacker
 * chose would hand them the account, so only the app scheme (duncit:), https
 * duncit.com hosts and http localhost are trusted; anything else is 400
 * "Unknown return address." and no redirect at all. The relay verifies and
 * stores nothing, so the token here is a placeholder. Scenario map: Other ›
 * Apple sign-in relay.
 */

const REFUSED = 'Unknown return address.';
const PLACEHOLDER_TOKEN = 'e2e-not-an-apple-token';

const relay = (body: Record<string, string>) => rest('POST', '/apple/callback', { form: true, body });

const expectRefused = (state: string) =>
  relay({ state, id_token: PLACEHOLDER_TOKEN }).then((res) => {
    expect(res.status, state).to.equal(400);
    expect(textOf(res.body), state).to.equal(REFUSED);
    expect(res.headers.location, `${state} is never redirected to`).to.be.undefined;
  });

describe('API · The Apple relay redirects only to Duncit and the app', { testIsolation: false }, () => {
  const trusted = `${serverOrigin()}/e2e-apple-return`;

  it('AR-01 a duncit.com return address gets the id_token in the fragment', () => {
    relay({ state: trusted, id_token: PLACEHOLDER_TOKEN }).then((res) => {
      expect(res.status).to.equal(303);
      expect(res.headers.location).to.equal(`${trusted}#id_token=${PLACEHOLDER_TOKEN}`);
    });
  });

  it("AR-02 the first authorisation's name is carried on with the token", () => {
    const user = JSON.stringify({ name: { firstName: 'Ee', lastName: 'Two' } });
    relay({ state: trusted, id_token: PLACEHOLDER_TOKEN, user }).then((res) => {
      expect(res.status).to.equal(303);
      const fragment = new URLSearchParams(new URL(String(res.headers.location)).hash.slice(1));
      expect(fragment.get('id_token')).to.equal(PLACEHOLDER_TOKEN);
      expect(fragment.get('name')).to.equal('Ee Two');
    });
  });

  it('AR-03 a cancelled sign-in is handed back as an error, not a token', () => {
    relay({ state: trusted, error: 'user_cancelled_authorize' }).then((res) => {
      expect(res.status).to.equal(303);
      expect(res.headers.location).to.equal(`${trusted}#error=user_cancelled_authorize`);
    });
  });

  it('AR-04 the native app scheme is trusted', () => {
    relay({ state: 'duncit://apple-callback', id_token: PLACEHOLDER_TOKEN }).then((res) => {
      expect(res.status).to.equal(303);
      expect(String(res.headers.location).startsWith('duncit://')).to.equal(true);
      expect(String(res.headers.location)).to.include(`id_token=${PLACEHOLDER_TOKEN}`);
    });
  });

  it('AR-05 a foreign host, a lookalike, plain http and a missing state are all refused', () => {
    [
      'https://example.com/steal',
      'https://evilduncit.com/steal',
      'https://duncit.com.example.com/steal',
      'http://duncit.com/steal',
      'ftp://duncit.com/steal',
      'not a url',
    ].forEach(expectRefused);
    relay({ id_token: PLACEHOLDER_TOKEN }).then((res) => {
      expect(res.status).to.equal(400);
      expect(textOf(res.body)).to.equal(REFUSED);
    });
  });
});
