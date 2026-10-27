import type { RunAccount } from '../../support/run-account';
import { countOperation, expectNotSent, staffAccount } from '../../support/ui-staff';

/**
 * Legal › Brand consent (/brand-consent): the one consent every e-commerce
 * brand partner signs. It is a single shared policy (slug
 * brand-partner-consent) — saving it makes every signed partner sign again — so
 * the spec never saves: it proves the form refuses a blank title before
 * anything is sent, and leaves. Writing the consent is not automated on staging.
 */

describe('Legal · Brand consent (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  beforeEach(() => {
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
  });

  it('BC-01 the consent form refuses a blank title and sends neither a create nor an update', () => {
    cy.interceptOperation('LegalPolicyBySlug');
    cy.visitPortal('legal', '/brand-consent');
    cy.wait('@LegalPolicyBySlug');
    cy.byTestId('page-header-title').should('have.text', 'Brand Consent');

    const creates = countOperation('CreateLegalPolicy');
    const updates = countOperation('UpdateLegalPolicy');
    cy.byTestId('brand-consent-title').type('x').clear().blur();
    cy.byTestId('brand-consent-form').should('contain.text', 'Title is required');
    cy.byTestId('brand-consent-save').should('be.enabled').click();
    cy.byTestId('brand-consent-title').should('have.attr', 'aria-invalid', 'true');
    expectNotSent(creates, 'CreateLegalPolicy');
    expectNotSent(updates, 'UpdateLegalPolicy');
  });
});
