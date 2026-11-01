/// <reference types="cypress" />
import { rest, textOf } from '../../../support/api-other';
import { runAccount } from '../../../support/run-account';

/**
 * Server: Scheduled marketing campaigns — the open and click tracking routes
 * every sent campaign email points at (GET /t/o, /t/c, /t/i in
 * crm/marketing/tracking.router.ts). Mail clients hit them unauthenticated, so
 * they never answer with an error page where an image is expected: an unknown
 * campaign still gets the 1×1 GIF, and a click resolves only against the
 * campaign's stored link table — a dead index is 404 "This link has expired.",
 * never a redirect somewhere the email did not name. Scenario map: Server ›
 * Scheduled marketing campaigns — "Campaign open and click tracking" (the
 * unknown-campaign, out-of-range click and out-of-range image steps).
 *
 * Scheduling a real campaign would mail real members, so the suite only
 * aims at a campaign id no campaign has; the counters it would bump belong to
 * nothing.
 */

const campaign = () => `e2e-no-such-campaign-${runAccount().stamp}`;

/** The pixel: 200, a GIF body, and nothing a proxy may cache. */
function expectPixel(path: string): void {
  rest('GET', path, { encoding: 'binary' }).then((res) => {
    expect(res.status, `${path} status`).to.equal(200);
    expect(res.headers['content-type'], `${path} content-type`).to.match(/^image\/gif/);
    expect(textOf(res.body).startsWith('GIF8'), `${path} answers a GIF`).to.equal(true);
  });
}

function expectExpiredLink(path: string): void {
  rest('GET', path).then((res) => {
    expect(res.status, `${path} status`).to.equal(404);
    expect(res.headers.location, `${path} redirects nowhere`).to.be.undefined;
    expect(textOf(res.body)).to.equal('This link has expired.');
  });
}

describe('API · Campaign tracking never breaks an email or opens a redirect', { testIsolation: false }, () => {
  it('CT-01 the open pixel answers an unknown campaign with the GIF, uncached', () => {
    const path = `/t/o/${campaign()}`;
    expectPixel(path);
    rest('GET', path).then((res) => {
      // Proxies caching the pixel would swallow every open after the first.
      expect(res.headers['cache-control']).to.equal('no-store, no-cache, must-revalidate, private');
    });
  });

  it('CT-02 a click on a link the campaign never stored is 404 "This link has expired."', () => {
    expectExpiredLink(`/t/c/${campaign()}/0`);
    expectExpiredLink(`/t/c/${campaign()}/999`);
  });

  it('CT-03 a click index that is not a number resolves to nothing as well', () => {
    expectExpiredLink(`/t/c/${campaign()}/not-a-number`);
  });

  it('CT-04 an image the campaign never stored falls back to the pixel instead of a 404', () => {
    expectPixel(`/t/i/${campaign()}/999`);
  });
});
