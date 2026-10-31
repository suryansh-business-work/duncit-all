/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  blockQuery,
  CENTER_SCROLL,
  expectMainSite404,
  fetchHtml,
  interceptQuery,
  linkUrl,
  metaContent,
  requirePolicies,
  siteBranding,
  siteUrl,
  visitSite,
  websiteCopy,
  type SiteBranding,
  type SitePolicy,
} from '../../../../support/ui-websites';

/**
 * duncit.com Policy Hub (/policies, @duncit/brand/widgets/policy-list) and the
 * per-policy pages (/policy/<slug>, widgets/policy-reader), answered by the Node
 * HTML server (website/main-website/server/main.ts) against the LIVE policy:
 * a fresh meta card for a live one, a real 404 for an unknown or malformed slug,
 * and a 301 for the legacy /policy?slug= address.
 */

const POLICY_TEXT = `query E2ePolicyText($slug: String!) { policyBySlug(slug: $slug) { title content } }`;

/** server/page-meta.ts MAX_DESCRIPTION: what a search snippet shows before it cuts the line itself. */
const MAX_DESCRIPTION = 160;

/** server/page-meta.ts plainText: an author's rich text as the one line a card shows, cut on a whole word. */
function plainText(value: string | null): string | null {
  if (!value) return null;
  const text = value.replaceAll(/<[^>]*>?/g, ' ').replaceAll(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length <= MAX_DESCRIPTION) return text;
  const cut = text.slice(0, MAX_DESCRIPTION - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

describe('UI duncit.com · Legal policies', CENTER_SCROLL, () => {
  let t: Translator['t'];
  let branding: SiteBranding;
  let policies: SitePolicy[];

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
    siteBranding().then((found) => {
      branding = found;
    });
    requirePolicies().then((found) => {
      policies = found;
    });
  });

  const cards = '[data-cms-widget="policy-list"] a[href^="/policy/"]';

  it('POL-01 the hub lists one card per active policy and reveals the search once loaded', () => {
    interceptQuery('publicPolicies', 'policies');
    visitSite('main', '/policies');
    cy.wait('@policies');
    cy.get(cards).should('have.length', policies.length);
    for (const policy of policies) {
      cy.get(`${cards}[href="/policy/${encodeURIComponent(policy.slug)}"]`)
        .should('contain.text', policy.title)
        .and('contain.text', t('website.main.policies.readCurrent'));
    }
    cy.get('[data-policy-search-wrap]').should('not.have.class', 'hidden');
  });

  it('POL-02 typing part of a title keeps only the matches and counts them', () => {
    const [policy] = policies;
    const query = policy.title.slice(0, Math.min(6, policy.title.length)).trim();
    const needle = query.toLowerCase();
    const matches = policies.filter(
      (p) => p.title.toLowerCase().includes(needle) || p.slug.toLowerCase().replaceAll('-', ' ').includes(needle),
    );
    visitSite('main', '/policies');
    cy.get('[data-policy-search-wrap]').should('not.have.class', 'hidden');
    cy.get('input[data-policy-search]').type(query);
    cy.get(cards).should('have.length', matches.length);
    const noun = matches.length === 1 ? t('website.main.policies.matchOne') : t('website.main.policies.matchMany');
    cy.get('[data-policy-count]').should('readText', `${matches.length} ${noun} “${query}”`);
  });

  it('POL-03 slug words typed with spaces find the policy by its slug', () => {
    const dashed = policies.find((p) => p.slug.includes('-')) ?? policies[0];
    const words = dashed.slug.replaceAll('-', ' ');
    visitSite('main', '/policies');
    cy.get('[data-policy-search-wrap]').should('not.have.class', 'hidden');
    cy.get('input[data-policy-search]').type(words);
    cy.get(`${cards}[href="/policy/${encodeURIComponent(dashed.slug)}"]`).should('exist');
  });

  it('POL-04 nothing matching says so, and Show all policies clears the search and refocuses it', () => {
    const query = 'zz-e2e-no-such-policy';
    visitSite('main', '/policies');
    cy.get('[data-policy-search-wrap]').should('not.have.class', 'hidden');
    cy.get('input[data-policy-search]').type(query);
    cy.get(cards).should('have.length', 0);
    cy.get('[data-cms-widget="policy-list"]').should('contain.text', `${t('website.main.policies.nothingMatches')} “${query}”`);
    cy.get('[data-clear-search]').should('readText', t('website.main.policies.showAll')).click();
    cy.get('input[data-policy-search]').should('have.value', '').and('be.focused');
    cy.get(cards).should('have.length', policies.length);
  });

  it('POL-05 an unreachable API leaves the hub saying the policies could not be loaded, with no search', () => {
    blockQuery('publicPolicies');
    visitSite('main', '/policies');
    cy.get('[data-cms-widget="policy-list"]').should('readText', t('website.main.policies.error'));
    cy.get('[data-policy-search-wrap]').should('have.class', 'hidden');
  });

  it('POL-06 a policy page loads its live text, retitles the page and links back to all policies', () => {
    const [policy] = policies;
    interceptQuery('policyBySlug', 'policy');
    visitSite('main', `/policy/${policy.slug}`);
    cy.wait('@policy').its('response.body.data.policyBySlug.title').should('eq', policy.title);
    cy.get('[data-page-heading]').should('readText', policy.title);
    cy.title().should('eq', `${policy.title} — Duncit`);
    cy.get('[data-cms-widget="policy-reader"] .skeleton').should('not.exist');
    cy.get('[data-cms-widget="policy-reader"]').invoke('text').should('not.be.empty');
    // The page's own back link; the closed menu drawer and the footer strip carry one too.
    cy.contains('main a[href="/policies"]', t('website.footer.allPolicies')).click();
    cy.location('pathname').should('eq', '/policies');
  });

  it('POL-07 the server answers /policy/<slug> with 200 and a meta card built from the live policy', () => {
    const [policy] = policies;
    cy.gql<{ policyBySlug: { title: string; content: string | null } }>(POLICY_TEXT, { slug: policy.slug }, { token: null }).then(
      ({ policyBySlug }) => {
        fetchHtml(siteUrl('main', `/policy/${policy.slug}`)).then(({ status, doc }) => {
          expect(status).to.eq(200);
          const description = plainText(policyBySlug.content);
          expect(metaContent(doc, 'meta[property="og:title"]')).to.eq(policyBySlug.title);
          const namesItself = policyBySlug.title.toLowerCase().includes(branding.app_name.toLowerCase());
          expect(doc.title).to.eq(namesItself ? policyBySlug.title : `${policyBySlug.title} | ${branding.app_name}`);
          if (description) expect(metaContent(doc, 'meta[property="og:description"]')).to.eq(description);
          expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).to.eq(linkUrl('mainSite', `/policy/${policy.slug}`));
        });
      },
    );
  });

  it('POL-08 an unknown slug, the reader page itself and a malformed slug are real 404s with the site 404 page', () => {
    for (const path of ['/policy/e2e-no-such-policy', '/policy/_reader', '/policy/Not_A_Valid_Slug']) {
      fetchHtml(siteUrl('main', path)).then(({ status, doc }) => {
        expect(status, path).to.eq(404);
        expectMainSite404(doc, path);
      });
    }
  });

  it('POL-09 the legacy /policy?slug= address is a permanent move to /policy/<slug>, and bare /policy to /policies', () => {
    const [policy] = policies;
    cy.request({ url: siteUrl('main', `/policy?slug=${policy.slug}`), followRedirect: false }).then((res) => {
      expect(res.status).to.eq(301);
      expect(res.headers.location).to.eq(`/policy/${policy.slug}`);
    });
    cy.request({ url: siteUrl('main', '/policy'), followRedirect: false }).then((res) => {
      expect(res.status).to.eq(301);
      expect(res.headers.location).to.eq('/policies');
    });
  });
});
