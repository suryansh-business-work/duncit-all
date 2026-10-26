/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { runMe } from '../../../support/ui-apps-2';

/**
 * Membership — coming soon (UI), live on staging. Tiers and benefits are read
 * from `membershipPricing` (Admin > Membership), so the page is checked
 * against the server's catalogue. The run account joins the notify-me list
 * with its own profile email — a row purged with the account.
 */

const PRICING = `query E2eUiMembershipPricing {
  membershipPricing { is_subscribed plans { id key } benefits { id } }
}`;

interface Pricing {
  is_subscribed: boolean;
  plans: Array<{ id: string; key: string }>;
  benefits: Array<{ id: string }>;
}

const pricing = () =>
  cy.gql<{ membershipPricing: Pricing }>(PRICING).then(({ membershipPricing }) => membershipPricing);

function openMembership(): void {
  cy.interceptOperation('MembershipPricing');
  cy.visitApp('/membership');
  cy.wait('@MembershipPricing');
  cy.byTestId('membership-page').should('be.visible');
}

describe('Membership', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  it('MB-01 the plans from Admin > Membership show as cards with disabled CTAs and a comparison table', () => {
    pricing().then((catalogue) => {
      openMembership();
      cy.byTestId('membership-page').should('contain.text', 'Membership is on its way');
      if (catalogue.plans.length === 0) {
        cy.byTestId('membership-empty').should('have.text', 'Membership plans will be announced soon.');
        return;
      }
      catalogue.plans.forEach((plan) => {
        cy.byTestId(`membership-plan-${plan.key}`).should('exist');
        cy.byTestId(`membership-plan-cta-${plan.key}`).should('be.disabled');
        cy.byTestId(`membership-plan-header-${plan.id}`).should('exist');
      });
      catalogue.benefits.forEach((benefit) => cy.byTestId(`membership-benefit-row-${benefit.id}`).should('exist'));
    });
  });

  it('MB-02 Notify me uses the profile email read-only, puts the member on the list, and the list survives a reload', () => {
    pricing().its('is_subscribed').should('eq', false);
    runMe().then((me) => {
      openMembership();
      cy.byTestId('membership-notify-email-input').should('have.value', me.email).and('have.attr', 'readonly');
      cy.byTestId('membership-notify-email').should('contain.text', 'Taken from your profile. Change it in Manage Account.');
      cy.interceptOperation('SubscribeMembershipNews');
      cy.byTestId('membership-notify-cta').should('have.text', 'Notify me').and('be.enabled').click();
      cy.wait('@SubscribeMembershipNews');
      cy.byTestId('membership-notify-done')
        .should('contain.text', 'You are on the list')
        .and('contain.text', 'We will email you as soon as membership opens.');
      openMembership();
      cy.byTestId('membership-notify-done').should('be.visible');
      cy.byTestId('membership-notify-card').should('not.exist');
      pricing().its('is_subscribed').should('eq', true);
    });
  });
});
