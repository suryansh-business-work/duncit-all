/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { fetchHtml, siteUrl, websiteCopy } from '../../../../support/ui-websites';

/**
 * The CMS renderer (website/cms-site, Astro SSR): the hostname picks the site —
 * read from X-Forwarded-Host, as nginx sends it (lib/cms-api.ts requestHost) —
 * and the path picks the page. robots.txt and sitemap.xml are per host, and the
 * sitemap lists published pages only (server cmsRender.service.ts sitemap).
 * The renderer's own copy is website.cms.* (components/NotFound.astro).
 */

const SITEMAP = `query E2eCmsSitemap($host: String!) { cmsSitemap(host: $host) { path updated_at } }`;
const UNKNOWN_HOST = 'e2e-no-such-cms-site.example';

const asHost = (host: string): Record<string, string> => ({ 'x-forwarded-host': host });

describe('UI CMS renderer · Hostname and path', () => {
  let t: Translator['t'];

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
  });

  it('CMS-01 a hostname no CMS site answers on gets the renderer\'s not-found page, 404 and noindex', () => {
    fetchHtml(siteUrl('cms', '/'), asHost(UNKNOWN_HOST)).then(({ status, doc }) => {
      expect(status).to.eq(404);
      expect(doc.querySelector('main h1')?.textContent).to.eq(t('website.cms.notFound.title'));
      expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).to.eq('noindex');
    });
  });

  it('CMS-02 robots.txt opens the site to crawlers and points at that host\'s own sitemap', () => {
    cy.request({ url: siteUrl('cms', '/robots.txt'), headers: asHost(UNKNOWN_HOST) }).then((res) => {
      expect(res.headers['content-type']).to.contain('text/plain');
      expect(res.body).to.eq(`User-agent: *\nAllow: /\n\nSitemap: http://${UNKNOWN_HOST}/sitemap.xml\n`);
    });
  });

  it('CMS-03 an unknown host\'s sitemap is an empty urlset', () => {
    cy.request({ url: siteUrl('cms', '/sitemap.xml'), headers: asHost(UNKNOWN_HOST) }).then((res) => {
      expect(res.headers['content-type']).to.contain('application/xml');
      const doc = new DOMParser().parseFromString(String(res.body), 'application/xml');
      expect(doc.documentElement.nodeName).to.eq('urlset');
      expect(doc.querySelectorAll('url')).to.have.length(0);
    });
  });

  describe('a published CMS site', () => {
    let host: string;
    let paths: string[];

    before(() => {
      host = String(Cypress.env('CMS_SITE_HOST') ?? '').trim();
      if (!host) throw new Error('Run prerequisite: CYPRESS_CMS_SITE_HOST is not set — name a hostname a staging CMS site lists in its domains (Website portal > Sites).');
      cy.gql<{ cmsSitemap: { path: string }[] }>(SITEMAP, { host }, { token: null }).then((data) => {
        paths = data.cmsSitemap.map((entry) => entry.path);
        if (!paths.length) throw new Error(`Staging prerequisite: the CMS site on ${host} has no published, indexable page.`);
      });
    });

    it('CMS-04 its sitemap lists exactly the published pages the API reports, on that host', () => {
      cy.request({ url: siteUrl('cms', '/sitemap.xml'), headers: asHost(host) }).then((res) => {
        const doc = new DOMParser().parseFromString(String(res.body), 'application/xml');
        const locs = [...doc.querySelectorAll('url > loc')].map((loc) => loc.textContent ?? '');
        expect(locs).to.deep.eq(paths.map((path) => `http://${host}${path}`));
      });
    });

    it('CMS-05 each sitemap page renders 200 as that site\'s page, not the renderer\'s not-found', () => {
      for (const path of paths.slice(0, 5)) {
        fetchHtml(siteUrl('cms', path), asHost(host)).then(({ status, doc }) => {
          expect(status, path).to.eq(200);
          expect(doc.title, `${path} has a title`).not.to.eq('');
          expect(doc.title).not.to.eq(t('website.cms.notFound.title'));
          expect(doc.querySelector('meta[name="robots"][content="noindex"]'), `${path} is indexable`).to.eq(null);
        });
      }
    });

    it('CMS-06 a path the site has no page for answers 404', () => {
      fetchHtml(siteUrl('cms', '/e2e-no-such-cms-page'), asHost(host)).then(({ status }) => {
        expect(status).to.eq(404);
      });
    });
  });
});
