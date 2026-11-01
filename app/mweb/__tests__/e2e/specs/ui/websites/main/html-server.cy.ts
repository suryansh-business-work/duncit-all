/// <reference types="cypress" />
import { apiOrigin, expectMainSite404, fetchHtml, siteUrl } from '../../../../support/ui-websites';

/**
 * duncit.com's HTML server (website/main-website/server/main.ts), the half
 * of the site that answers before any page script runs: a short-code path is
 * a real 302 to the API resolver (carrying the visitor's referrer as `dr`),
 * every other path is a page or the branded 404, only GET and HEAD are
 * served, and static files carry spa.conf's cache and security headers
 * (server/static-files.ts).
 *
 * Nothing here follows a short link: the hop is asserted by its Location, so
 * the resolver never counts a click. The code used is code-shaped
 * (SHORT_CODE_PATTERN: 8 base62 characters with a digit and an uppercase
 * letter) and needs no link behind it — the hop never looks one up.
 * Blog cards and policy pages, also answered here, are covered by
 * blog-newsroom.cy.ts and legal-policies.cy.ts.
 *
 * Scenario map: Website › Short link hop and meta cards ("Short code path
 * redirects to the resolver", "Non-code paths are never treated as links",
 * "HTML server method, 404 and cache rules").
 */

const CODE = 'aB3xY9Zq';

type Headers = Record<string, string | string[]>;

function hit(path: string, options: Partial<Cypress.RequestOptions> = {}): Cypress.Chainable<Cypress.Response<string>> {
  return cy.request<string>({
    url: siteUrl('main', path),
    followRedirect: false,
    failOnStatusCode: false,
    ...options,
  });
}

const header = (headers: Headers, name: string): string => {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value.join(', ') : String(value ?? '');
};

describe('UI Website · duncit.com HTML server: the short-link hop, real 404s and static rules', () => {
  it('HS-01 a short code hops to the API resolver with the visitor’s referrer as dr, never cached', () => {
    hit(`/${CODE}`, { headers: { referer: 'https://instagram.com/' } }).then((res) => {
      expect(res.status).to.eq(302);
      expect(header(res.headers, 'location')).to.eq(`${apiOrigin()}/r/${CODE}?dr=${encodeURIComponent('https://instagram.com/')}`);
      expect(header(res.headers, 'cache-control')).to.eq('no-store');
    });
  });

  it('HS-02 a dr already on the link is kept over the referrer, and a trailing slash is trimmed', () => {
    hit(`/${CODE}?dr=${encodeURIComponent('https://x.com')}`, { headers: { referer: 'https://instagram.com/' } }).then((res) => {
      expect(res.status).to.eq(302);
      expect(header(res.headers, 'location')).to.eq(`${apiOrigin()}/r/${CODE}?dr=${encodeURIComponent('https://x.com')}`);
    });
    hit(`/${CODE}/`).then((res) => {
      expect(res.status).to.eq(302);
      expect(header(res.headers, 'location'), 'no referrer, no dr').to.eq(`${apiOrigin()}/r/${CODE}`);
    });
  });

  it('HS-03 a real page is served as itself, and paths that are not code-shaped are a 404, never a hop', () => {
    hit('/about').then((res) => {
      expect(res.status).to.eq(200);
      expect(header(res.headers, 'location'), 'no redirect').to.eq('');
      expect(header(res.headers, 'content-type')).to.contain('text/html');
      expect(header(res.headers, 'x-content-type-options'), 'security headers on every answer').to.eq('nosniff');
    });
    // 8 lowercase letters; 8 capitals with no digit; 9 characters.
    ['/abcdefgh', '/ABCDEFGH', '/ABCDEFGH1'].forEach((path) =>
      hit(path).then((res) => {
        expect(res.status, path).to.eq(404);
        expect(header(res.headers, 'location'), `${path} is not a link`).to.eq('');
      }),
    );
  });

  it('HS-04 only GET and HEAD are answered: POST is 405 naming them, HEAD is headers with no body', () => {
    hit('/about', { method: 'POST', body: {} }).then((res) => {
      expect(res.status).to.eq(405);
      expect(header(res.headers, 'allow')).to.eq('GET, HEAD');
    });
    hit('/about', { method: 'HEAD' }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body ?? '', 'HEAD carries no body').to.eq('');
    });
    fetchHtml(siteUrl('main', '/this-page-does-not-exist')).then(({ status, doc }) => {
      expect(status).to.eq(404);
      expectMainSite404(doc, '/this-page-does-not-exist');
    });
  });

  it('HS-05 hashed bundles are cached for a year as immutable, other files for thirty days, and nothing outside the build is read', () => {
    hit('/').then((home) => {
      const bundle = /(?:src|href)="(\/_astro\/[^"]+\.(?:js|css))"/.exec(String(home.body))?.[1];
      expect(bundle, 'the home page links a hashed bundle').to.be.a('string');
      hit(String(bundle), { headers: { 'accept-encoding': 'gzip' } }).then((res) => {
        expect(res.status).to.eq(200);
        expect(header(res.headers, 'cache-control')).to.eq('public, max-age=31536000, immutable');
        expect(header(res.headers, 'vary')).to.contain('Accept-Encoding');
      });
    });
    hit('/duncit-logo.svg').then((res) => {
      expect(res.status).to.eq(200);
      expect(header(res.headers, 'cache-control')).to.eq('public, max-age=2592000');
    });
    hit('/..%2f..%2fetc/passwd').then((res) => expect(res.status, 'a path escaping the build').to.eq(404));
  });
});
