/// <reference types="cypress" />
import { openMenu } from '../../../support/menu-steps';
import { runAccount } from '../../../support/run-account';
import { declineTracking, publicFlag, visitAndWait } from '../../../support/ui-apps-3';

/**
 * Pod Plans, live (scenario map › Pod Plans).
 *
 * /pod-plans lists the active plans an admin publishes (`publicPodPlans`):
 * each card names the plan with its price label and description, and a plan
 * marked "coming soon" carries the chip. Only the menu row is gated by the
 * `pod_plans_section` flag — the page itself always loads (PodPlansPage.tsx,
 * profileSections.ts). The plans and the flag are read from the server first.
 */

interface Plan {
  id: string;
  name: string;
  price_label: string | null;
  description: string | null;
  is_coming_soon: boolean;
}

const PLANS = `query E2eUi3Plans { publicPodPlans { id name price_label description is_coming_soon } }`;

describe('Pod Plans', () => {
  const account = runAccount();
  let plans: Plan[] = [];

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    cy.gql<{ publicPodPlans: Plan[] }>(PLANS).then((data) => {
      plans = data.publicPodPlans;
      if (plans.length === 0) throw new Error('Staging prerequisite: no active pod plan is published (Admin > Pod Plans).');
    });
  });

  beforeEach(() => {
    declineTracking();
  });

  it('PP-01 the menu offers "Pod Plans" exactly when pod_plans_section is on', () => {
    publicFlag('pod_plans_section').then((on) => {
      openMenu();
      cy.byTestId('sidebar-item-FAQs').should('exist');
      cy.byTestId('sidebar-item-Pod Plans').should(on ? 'exist' : 'not.exist');
    });
  });

  it('PP-02 /pod-plans lists every published plan with its price, description and coming-soon chip', () => {
    visitAndWait('/pod-plans', 'PublicPodPlans');
    cy.byTestId('pod-plans-header-title').should('have.text', 'Pod Plans');
    cy.byTestIdPrefix('pod-plans-plan-').should(($cards) => {
      const cards = Cypress.$.makeArray($cards).filter((el) => !String(el.dataset.testid).endsWith('-coming-soon'));
      expect(cards, 'one card per published plan').to.have.length(plans.length);
    });
    plans.forEach((plan) => {
      cy.byTestId(`pod-plans-plan-${plan.id}`).should('contain.text', plan.name);
      if (plan.price_label) cy.byTestId(`pod-plans-plan-${plan.id}`).should('contain.text', plan.price_label);
      if (plan.description) cy.byTestId(`pod-plans-plan-${plan.id}`).should('contain.text', plan.description);
      cy.byTestId(`pod-plans-plan-${plan.id}-coming-soon`).should(plan.is_coming_soon ? 'exist' : 'not.exist');
    });
    cy.byTestId('pod-plans-error').should('not.exist');
  });

  it('PP-03 back returns to the screen the plans were opened from', () => {
    cy.visitApp('/faqs');
    cy.location('pathname').should('eq', '/faqs');
    visitAndWait('/pod-plans', 'PublicPodPlans');
    cy.byTestId('pod-plans-header-back').click();
    cy.location('pathname').should('eq', '/faqs');
  });
});
