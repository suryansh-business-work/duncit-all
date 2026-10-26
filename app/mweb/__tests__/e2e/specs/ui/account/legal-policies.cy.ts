/// <reference types="cypress" />
import { auth } from '@duncit/auth-tokens';
import { signInRunMember } from '../../../support/access-steps';
import { openMenu } from '../../../support/menu-steps';

/**
 * Legal policies, live on staging: the collapsible Policies row in /menu, the
 * policy page (/policies/:slug, PolicyRenderer.tsx) with its PDF button, and
 * the Terms / Privacy links under sign-in and sign-up, which point at the
 * Branding setting's URLs or, unset, the shared auth tokens' defaults
 * (useBrandingAssets.ts).
 */

const POLICIES_QUERY = `query E2ePublicPolicies { publicPolicies { id slug title } }`;
const BRANDING_QUERY = `query E2eLegalUrls { branding { terms_url privacy_url } }`;

/** Base64 of "%PDF-": every PDF the server renders starts with it. */
const PDF_MAGIC_BASE64 = 'JVBERi0';

interface PublicPolicy {
  id: string;
  slug: string;
  title: string;
}

type LegalUrls = { branding: { terms_url: string | null; privacy_url: string | null } | null };

const firstPolicy = () =>
  cy.gql<{ publicPolicies: PublicPolicy[] }>(POLICIES_QUERY, {}, { token: null }).then((data) => {
    const policy = data.publicPolicies[0];
    if (!policy) throw new Error('Staging prerequisite: no active policy is published (Legal > Policies).');
    return policy;
  });

const legalUrls = () =>
  cy.gql<LegalUrls>(BRANDING_QUERY, {}, { token: null }).then((data) => ({
    terms: data.branding?.terms_url || auth.legal.termsUrl,
    privacy: data.branding?.privacy_url || auth.legal.privacyUrl,
  }));

/** The link opens the right address in a new tab. */
function expectNewTabLink(testId: string, href: string, text: string): void {
  cy.byTestId(testId)
    .should('have.text', text)
    .and('have.attr', 'href', href)
    .and('have.attr', 'target', '_blank');
}

describe('UI Legal policies', () => {
  let policy: PublicPolicy;

  before(() => {
    signInRunMember();
    firstPolicy().then((found) => {
      policy = found;
    });
  });

  it('LP-01 the Policies row in the menu expands into the published policies and collapses again', () => {
    openMenu();
    cy.byTestId('sidebar-policies-toggle').should('have.attr', 'aria-expanded', 'false').click();
    cy.byTestId('sidebar-policies-toggle').should('have.attr', 'aria-expanded', 'true');
    cy.byTestId(`sidebar-policy-${policy.slug}`).should('contain.text', policy.title);
    cy.byTestId('sidebar-policies-toggle').click();
    cy.byTestId('sidebar-policies-toggle').should('have.attr', 'aria-expanded', 'false');
    cy.byTestId(`sidebar-policy-${policy.slug}`).should('not.exist');
  });

  it('LP-02 a policy opened from the menu shows its title, PDF actions, body and last update', () => {
    openMenu();
    cy.byTestId('sidebar-policies-toggle').click();
    cy.interceptOperation('PolicyBySlug');
    cy.byTestId(`sidebar-policy-${policy.slug}`).click();
    cy.location('pathname').should('eq', `/policies/${policy.slug}`);
    cy.wait('@PolicyBySlug');
    cy.byTestId('policy-renderer-title').should('have.text', policy.title);
    cy.byTestId('policy-pdf-view').should('contain.text', 'View PDF');
    cy.byTestId('policy-pdf-download').should('contain.text', 'Download PDF');
    cy.byTestId('policy-renderer-content').should('exist');
    cy.byTestId('policy-renderer-updated').invoke('text').should('match', /^Last updated \S/);
  });

  it('LP-03 a slug no policy has says so', () => {
    const slug = 'e2e-no-such-policy';
    cy.interceptOperation('PolicyBySlug');
    cy.visitApp(`/policies/${slug}`);
    cy.wait('@PolicyBySlug');
    cy.byTestId('policy-renderer-not-found').should('have.text', `No policy found for slug ${slug}.`);
    cy.byTestId('policy-renderer').should('not.exist');
  });

  it('LP-04 Download PDF fetches the rendered PDF of the policy without an error', () => {
    cy.interceptOperation('PolicyBySlug');
    cy.visitApp(`/policies/${policy.slug}`);
    cy.wait('@PolicyBySlug');
    cy.interceptOperation('PolicyPdf');
    cy.byTestId('policy-pdf-download').click();
    cy.wait('@PolicyPdf').its('response.body.data.policyPdfBase64').should('be.a', 'string').and('match', new RegExp(`^${PDF_MAGIC_BASE64}`));
    cy.byTestId('policy-pdf-error').should('not.exist');
  });

  it('LP-05 sign-in and sign-up name the Terms and Privacy links, which open the Branding URLs in a new tab', () => {
    legalUrls().then((urls) => {
      cy.clearAuth();
      cy.visitApp('/login');
      cy.byTestId('legal-links').invoke('text').should('match', /^By signing in, you agree to our /);
      expectNewTabLink('legal-links-terms', urls.terms, 'Terms & Conditions');
      expectNewTabLink('legal-links-privacy', urls.privacy, 'Privacy Policy');
      cy.visitApp('/register');
      cy.byTestId('legal-links').invoke('text').should('match', /^By signing up, you agree to our /);
      expectNewTabLink('legal-links-terms', urls.terms, 'Terms & Conditions');
    });
  });
});
