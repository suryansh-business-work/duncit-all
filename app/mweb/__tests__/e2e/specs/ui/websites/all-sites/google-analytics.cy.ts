/// <reference types="cypress" />
import { interceptQuery, visitSite, type SiteKey } from '../../../../support/ui-websites';

/**
 * Google Analytics on the websites (@duncit/brand/google-analytics.ts): the tag
 * is asked for only once the visitor allows analytics, with the site's own
 * TrackedWebsite key, and gtag.js is installed with whatever GA4 id Tech >
 * Google Analytics set for that site — or nothing at all when it set none.
 * (support/e2e.ts answers googletagmanager.com with an empty script, so no hit
 * ever reaches Google; the <script> tag itself is what is asserted.)
 */

const TAG = `query E2eGaTag($site: TrackedWebsite!) { googleAnalyticsTag(site: $site) }`;

const sites: { site: SiteKey; key: string }[] = [
  { site: 'main', key: 'MAIN' },
  { site: 'ads', key: 'ADS' },
  { site: 'earnwith', key: 'EARNWITH' },
  { site: 'partners', key: 'PARTNERS' },
  { site: 'status', key: 'STATUS' },
  { site: 'ecomm', key: 'ECOMM' },
];

describe('UI Websites · Google Analytics', () => {
  it('GA-01 duncit.com asks for nothing before an answer, and asks only after Accept all', () => {
    let asked = 0;
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if (String((req.body as { query?: string })?.query ?? '').includes('googleAnalyticsTag')) asked += 1;
    });
    interceptQuery('publicWebsiteReels', 'reels');
    visitSite('main', '/', { consent: 'none' });
    // The reel request goes out as the page loads; by then a tag request would have too.
    cy.wait('@reels').then(() => expect(asked, 'tag requests before consent').to.eq(0));
    cy.get('script[src*="googletagmanager.com/gtag/js"]').should('not.exist');
    interceptQuery('googleAnalyticsTag', 'tag');
    // Accept all is the banner's first primary button (consent-banner.ts appends accept, reject, customise).
    cy.get('section.duncit-consent .dc-primary').first().click();
    cy.wait('@tag').its('request.body.variables.site').should('eq', 'MAIN');
  });

  for (const { site, key } of sites) {
    it(`GA-02 with analytics allowed, ${site} installs gtag.js with its configured GA4 id (or none)`, () => {
      cy.gql<{ googleAnalyticsTag: string | null }>(TAG, { site: key }, { token: null }).then(({ googleAnalyticsTag: id }) => {
        interceptQuery('googleAnalyticsTag', 'tag');
        visitSite(site, '/', { consent: 'accept' });
        cy.wait('@tag').its('request.body.variables.site').should('eq', key);
        if (id) {
          cy.get(`script[src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}"]`).should('exist');
          cy.window().its('dataLayer').should('be.an', 'array');
        } else {
          cy.get('script[src*="googletagmanager.com/gtag/js"]').should('not.exist');
        }
      });
    });
  }
});
