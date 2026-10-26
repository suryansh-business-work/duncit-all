/// <reference types="cypress" />
import { rest, textOf } from '../../../support/api-other';

/**
 * The short-link resolver's refusals (server/src/modules/crm/marketing/
 * shortLink.router.ts, mounted at /r):
 *
 *   GET /r/<code>  a path that is not code-shaped (SHORT_CODE_PATTERN: 8 base62
 *                  chars with a digit and an uppercase letter) → 404 "Link not
 *                  found." without a database lookup; a code-shaped code that is
 *                  no active link → 404 "This link is no longer active.", for a
 *                  browser and a link-preview crawler alike
 *   GET /r/v       the landing report: an unknown marker records nothing and
 *                  answers {"click_id": null}, never cached
 *
 * Resolving a REAL link counts a click on someone's campaign, so the happy
 * path needs a link made for the run (see the run report). Scenario map:
 * Other › Short links ("Unknown, retired and malformed codes", "Landing visit
 * report and journey").
 */

/** Code-shaped (digit + uppercase, 8 chars) — and no link the platform has issued. */
const UNKNOWN_CODE = 'E2e0Zz9Q';
const UNKNOWN_CLICK = '00000000-0000-4000-8000-000000000000';
const CRAWLER_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

const expectText = (path: string, message: string, headers: Record<string, string> = {}) =>
  rest('GET', path, { headers }).then((res) => {
    expect(res.status, path).to.equal(404);
    expect(res.headers['content-type'], path).to.include('text/plain');
    expect(textOf(res.body), path).to.equal(message);
    expect(res.headers.location, `${path} never redirects`).to.be.undefined;
  });

describe('API · Short links refuse unknown and malformed codes and record nothing', { testIsolation: false }, () => {
  it('SL-01 a path that is not code-shaped is "Link not found."', () => {
    // Too short, no digit/uppercase, and too long: each fails the pattern before any lookup.
    ['/r/abc', '/r/abcdefgh', '/r/ABCDEFG12'].forEach((path) => expectText(path, 'Link not found.'));
  });

  it('SL-02 a code-shaped code with no active link is "This link is no longer active."', () => {
    expectText(`/r/${UNKNOWN_CODE}`, 'This link is no longer active.');
  });

  it('SL-03 a link-preview crawler gets the same answer and no card for an unknown code', () => {
    expectText(`/r/${UNKNOWN_CODE}`, 'This link is no longer active.', { 'user-agent': CRAWLER_UA });
  });

  it('SL-04 the landing report with no marker records nothing and is never cached', () => {
    rest<{ click_id: string | null }>('GET', '/r/v').then((res) => {
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ click_id: null });
      expect(res.headers['cache-control']).to.equal('no-store');
    });
  });

  it('SL-05 unknown click ids and codes are reported as no click', () => {
    [
      { dlc: UNKNOWN_CLICK },
      { dl: UNKNOWN_CODE },
      { dl: 'not-a-code', dr: 'https://instagram.com/' },
      { dlc: UNKNOWN_CLICK, dl: UNKNOWN_CODE },
    ].forEach((qs) => {
      rest<{ click_id: string | null }>('GET', '/r/v', { qs }).then((res) => {
        expect(res.status, JSON.stringify(qs)).to.equal(200);
        expect(res.body, JSON.stringify(qs)).to.deep.equal({ click_id: null });
      });
    });
  });
});
