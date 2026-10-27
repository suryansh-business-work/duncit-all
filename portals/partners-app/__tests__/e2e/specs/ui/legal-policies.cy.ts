/// <reference types="cypress" />
import { grantRunRoles, revokeRunRoles, signInRunPartner } from '../../support/ui-partners-3';

/**
 * Legal policies, live (scenario map › Partners › Legal policies).
 *
 * /policies (the Help hub's Policies tab) forwards to the first active policy
 * (src/pages/policies-page/PartnerPoliciesPage.tsx); /policies/:slug lists the
 * active policies on the left (`publicPolicies`) and renders the one named by
 * the slug (`policyBySlug`, PartnerPolicyArticle.tsx): its title, its rich
 * text and "Last updated …". An unknown slug reads "No policy found."; a
 * policy that exists but is switched off reads "This policy is currently
 * hidden." and is not listed. Read-only: nothing is written.
 */

const PUBLIC_POLICIES = `query E2eUiP3Policies { publicPolicies { slug title } }`;
const POLICY = `query E2eUiP3Policy($slug: String!) { policyBySlug(slug: $slug) { slug title content is_active } }`;
/** The Legal portal's list, read with LEGAL_MANAGER granted for the one call. */
const HIDDEN_POLICIES = `query E2eUiP3HiddenPolicies { policies(filter: { is_active: false }) { slug } }`;

interface PolicyRow {
  slug: string;
  title: string;
}

/** The text a browser makes of `html` — what the article shows of it. */
const textOf = (html: string): string => new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? '';

/** The article for `slug` once the server has answered. */
function openPolicy(slug: string): void {
  cy.interceptOperation('PartnerPolicyBySlug');
  cy.interceptOperation('PartnerPublicPolicies');
  cy.visitApp(`/policies/${slug}`);
  cy.wait(['@PartnerPublicPolicies', '@PartnerPolicyBySlug']);
}

/** The article shows `slug`'s title, its text and the update line, and the left list marks it current. */
function expectArticle(slug: string): void {
  cy.gql<{ policyBySlug: PolicyRow & { content: string } }>(POLICY, { slug }, { token: null }).then(({ policyBySlug }) => {
    cy.byTestId('policy-title').should('have.text', policyBySlug.title);
    cy.byTestId('policy-content').invoke('text').then((text) => {
      expect(text.trim(), 'policy text').to.equal(textOf(policyBySlug.content));
    });
    cy.byTestId('policy-updated').invoke('text').should('match', /^Last updated \S/);
    cy.byTestId(`policy-link-${slug}`).should('have.attr', 'aria-current', 'page');
  });
}

describe('Partners · Legal policies', () => {
  let policies: PolicyRow[] = [];
  let hiddenSlug = '';

  before(() => {
    cy.gql<{ publicPolicies: PolicyRow[] }>(PUBLIC_POLICIES, {}, { token: null }).then(({ publicPolicies }) => {
      policies = publicPolicies;
      if (policies.length < 2) {
        throw new Error('Staging prerequisite: fewer than two active policies (Legal portal), so there is nothing to switch between.');
      }
    });
    grantRunRoles(['LEGAL_MANAGER']).then((token) =>
      cy.gql<{ policies: Array<{ slug: string }> }>(HIDDEN_POLICIES, {}, { token }).then((data) => {
        hiddenSlug = data.policies[0]?.slug ?? '';
      }),
    );
    revokeRunRoles(['LEGAL_MANAGER']);
  });

  beforeEach(() => {
    signInRunPartner();
  });

  after(() => {
    // Again, in case the read above failed between the grant and its revoke.
    revokeRunRoles(['LEGAL_MANAGER']);
  });

  it('LP-01 Policies forwards to the first active policy and lists every active one', () => {
    cy.interceptOperation('PartnerPublicPolicies');
    cy.visitApp('/policies');
    cy.wait('@PartnerPublicPolicies');
    cy.location('pathname').should('eq', `/policies/${policies[0].slug}`);
    policies.forEach((policy) => cy.byTestId(`policy-link-${policy.slug}`).should('have.text', policy.title));
    expectArticle(policies[0].slug);
  });

  it('LP-02 picking another policy opens it by its slug, and picking the first again brings it back', () => {
    const [first, second] = policies;
    openPolicy(first.slug);
    cy.interceptOperation('PartnerPolicyBySlug');
    cy.byTestId(`policy-link-${second.slug}`).click();
    cy.wait('@PartnerPolicyBySlug');
    cy.location('pathname').should('eq', `/policies/${second.slug}`);
    expectArticle(second.slug);
    cy.byTestId(`policy-link-${first.slug}`).click();
    cy.location('pathname').should('eq', `/policies/${first.slug}`);
    expectArticle(first.slug);
  });

  it('LP-03 an unknown slug reads No policy found.', () => {
    openPolicy('e2e-no-such-policy');
    cy.byTestId('policy-not-found').should('have.text', 'No policy found.');
    cy.byTestId('policy-title').should('not.exist');
  });

  it('LP-04 a switched-off policy reads This policy is currently hidden. and is not in the list', function () {
    if (!hiddenSlug) {
      // Staging has no inactive policy to open; nothing here can make one without editing shared legal content.
      this.skip();
    }
    openPolicy(hiddenSlug);
    cy.byTestId('policy-hidden').should('have.text', 'This policy is currently hidden.');
    cy.byTestId(`policy-link-${hiddenSlug}`).should('not.exist');
    cy.byTestId('policy-title').should('not.exist');
  });
});
