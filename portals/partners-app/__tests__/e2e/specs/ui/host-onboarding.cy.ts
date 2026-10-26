import { partnerWorld2, signInRunPartner } from '../../support/ui-partners-2';

/**
 * Partners › Host onboarding (/become-host), as the host the fixture step had
 * approved. BecomeHostPage keeps the application form for somebody still applying;
 * an account holding HOST (or an APPROVED profile) is shown its hosting state
 * instead — BecomeHostPage.tsx `isHost`.
 *
 * The applying-member rows (steps 1-3, submit, withdraw, a rejected
 * application) need an account WITHOUT the HOST role, which this run's account
 * no longer is by the time this step runs.
 */

describe('Partners UI · Host onboarding (an approved host)', () => {
  before(() => {
    signInRunPartner();
    partnerWorld2();
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('HO-01 an approved host sees the hosting state, not the application form, and Your Pods opens /host/pods', () => {
    cy.interceptOperation('PartnerMyHost');
    cy.visitApp('/become-host');
    cy.wait('@PartnerMyHost').its('response.body.data.myHost.status').should('eq', 'APPROVED');
    cy.byTestId('become-host-approved')
      .should('be.visible')
      .and('contain.text', 'Your host profile is approved. Create and manage your pods from the Host section.');
    cy.byTestId('become-host-your-pods').should('contain.text', 'Your Pods').click();
    cy.location('pathname').should('eq', '/host/pods');
    cy.byTestId('host-pods-hub').should('be.visible');
  });
});
