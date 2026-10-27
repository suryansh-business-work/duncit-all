/// <reference types="cypress" />
import { countOperation, expectNotSent, signInRunPartner, visitAndWait } from '../../support/ui-partners-3';

/**
 * Partner support, live (scenario map › Partners › Partner support).
 *
 * /support (the Help hub's Support tab, src/pages/support-page/SupportPage.tsx)
 * opens the support form (src/forms/support) with the account's name and its
 * locked email filled in from `me`. The Zod rules (@duncit/forms zodRules)
 * refuse an empty name, a subject under 3 characters and a message under 10
 * before anything is sent — this spec stops there, so no request reaches the
 * support desk.
 */

const ME = `query E2eUiP3SupportMe { me { full_name first_name last_name email } }`;

describe('Partners · Partner support', () => {
  let name = '';
  let email = '';

  before(() => {
    signInRunPartner();
    cy.gql<{ me: { full_name: string | null; first_name: string | null; last_name: string | null; email: string } }>(ME).then(
      ({ me }) => {
        name = me.full_name || [me.first_name, me.last_name].filter(Boolean).join(' ');
        email = me.email;
      },
    );
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('PS-01 the form opens with the account’s name and locked email, and refuses empty or short fields without sending', () => {
    visitAndWait('/support', 'PartnerSupportPage');
    cy.byTestId('support-name').find('input').should('have.value', name);
    cy.byTestId('support-email').find('input').should('have.value', email).and('be.disabled');
    const sends = countOperation('PartnerSubmitSupport');
    cy.byTestId('support-name').find('input').clear();
    cy.byTestId('support-subject').find('input').type('Hi');
    cy.byTestId('support-message').find('textarea').first().type('Too short');
    cy.byTestId('support-submit').should('have.text', 'Send to support').click();
    cy.byTestId('support-name').should('contain.text', 'Name is required');
    cy.byTestId('support-subject').should('contain.text', 'Subject must be at least 3 characters');
    cy.byTestId('support-message').should('contain.text', 'Message must be at least 10 characters');
    cy.byTestId('support-name').find('input').should('have.focus');
    expectNotSent(sends, 'PartnerSubmitSupport');
  });
});
