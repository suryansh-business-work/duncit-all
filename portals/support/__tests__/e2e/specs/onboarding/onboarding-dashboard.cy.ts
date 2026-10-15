import type { RunAccount } from '../../support/run-account';
import { onboardingAccount, productsVisible, releaseOnboarding, signInOnboarding } from '../../support/ui-onboarding';

/**
 * Onboarding · Dashboard: the overview at `/` (src/pages/DashboardPage.tsx),
 * drawn from ONE query, OnboardingDashboard. Every figure is checked against
 * what that query answered, so the assertion is "the widget shows the server's
 * numbers" whatever staging holds. The brand segment rides behind
 * `is_product_visible` (`ecommBrands @include(if: $withEcomm)`).
 */

interface StatusItem {
  status?: string | null;
}

interface DashboardData {
  me: { email: string; first_name: string | null; full_name: string | null };
  hosts: StatusItem[];
  venues: StatusItem[];
  ecommBrands?: StatusItem[];
  surveys: { id: string }[];
  onboardingMeetings: { kind: string | null }[];
}

const STATUSES = new Set(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']);
/** `countByStatus` + `sumCounts` in onboardingStats.ts: only the four known statuses count. */
const total = (items: StatusItem[] = []) => items.filter((i) => STATUSES.has(i.status ?? '')).length;
const withStatus = (items: StatusItem[] = [], status: string) => items.filter((i) => i.status === status).length;
const meetingsOf = (data: DashboardData, kind: string) => data.onboardingMeetings.filter((m) => m.kind === kind).length;

/** The tile's only number is exactly `n` (its label and caption carry no digits). */
function shows(testId: string, n: number): void {
  cy.byTestId(testId).should(($tile) => {
    expect($tile.text().match(/\d+/g), `${testId} shows ${n}`).to.deep.equal([String(n)]);
  });
}

/** The dashboard, and what its one query answered. */
function openDashboard(): Cypress.Chainable<{ data: DashboardData; withEcomm: boolean }> {
  cy.interceptOperation('OnboardingDashboard');
  cy.visitPortal('onboarding', '/');
  return cy.wait('@OnboardingDashboard').then(({ request, response }) => {
    expect(response?.body.errors, 'OnboardingDashboard answers without errors').to.be.undefined;
    return { data: response?.body.data as DashboardData, withEcomm: request.body.variables.withEcomm as boolean };
  });
}

describe('Onboarding · Dashboard (run account, password CHANGED)', () => {
  let account: RunAccount;
  let ecommOn = false;

  before(() => {
    account = onboardingAccount();
    productsVisible().then((on) => {
      ecommOn = on;
    });
  });

  after(() => {
    releaseOnboarding(account);
  });

  beforeEach(() => {
    signInOnboarding(account);
  });

  it('OD-01 the overview greets the signed-in staffer, its KPIs and meeting tiles match the query, and the account card shows their email', () => {
    openDashboard().then(({ data }) => {
      const firstName = data.me.first_name || data.me.full_name?.split(' ')[0] || 'there';
      cy.byTestId('onboarding-dashboard-title').should('have.text', `Welcome back, ${firstName}`);
      shows('onboarding-kpi-total-hosts', total(data.hosts));
      shows('onboarding-kpi-total-venues', total(data.venues));
      shows('onboarding-kpi-total-surveys', data.surveys.length);
      const brands = data.ecommBrands ?? [];
      const pending = withStatus(data.hosts, 'SUBMITTED') + withStatus(data.venues, 'SUBMITTED') + withStatus(brands, 'SUBMITTED');
      const approved = withStatus(data.hosts, 'APPROVED') + withStatus(data.venues, 'APPROVED') + withStatus(brands, 'APPROVED');
      shows('onboarding-kpi-pending-review', pending);
      shows('onboarding-kpi-approved', approved);
      shows('onboarding-meeting-tile-VENUE', meetingsOf(data, 'VENUE'));
      shows('onboarding-meeting-tile-HOST', meetingsOf(data, 'HOST'));
      cy.byTestId('account-summary-card').should('contain.text', data.me.email);
    });
  });

  it('OD-02 a KPI, a meeting tile and each status card open their lists', () => {
    openDashboard();
    cy.byTestId('onboarding-kpi-total-hosts').click();
    cy.location('pathname').should('eq', '/hosts');

    openDashboard();
    cy.byTestId('onboarding-kpi-total-surveys').click();
    cy.location('pathname').should('eq', '/surveys');

    openDashboard();
    cy.byTestId('onboarding-meeting-tile-HOST').click();
    cy.location('pathname').should('eq', '/meetings/host');
    cy.location('search').should('eq', '?status=REQUESTED');
    cy.byTestId('meeting-status-REQUESTED').should('have.attr', 'aria-pressed', 'true');

    openDashboard();
    cy.byTestId('onboarding-status-card-venues').click();
    cy.location('pathname').should('eq', '/venues');

    openDashboard();
    cy.byTestId('onboarding-status-card-hosts').click();
    cy.location('pathname').should('eq', '/hosts');
  });

  it('OD-03 the brand segment follows is_product_visible: asked for and drawn only while it is on', () => {
    openDashboard().then(({ data, withEcomm }) => {
      expect(withEcomm, 'the dashboard asks for brands exactly when the flag is on').to.equal(ecommOn);
      if (ecommOn) {
        shows('onboarding-kpi-total-brands', total(data.ecommBrands));
        shows('onboarding-meeting-tile-ECOMM', meetingsOf(data, 'ECOMM'));
        cy.byTestId('onboarding-status-card-ecomm-brands').click();
        cy.location('pathname').should('eq', '/ecomm-brands');
        return;
      }
      expect(data.ecommBrands, 'no brands are asked for while the flag is off').to.be.undefined;
      cy.byTestId('onboarding-kpi-total-hosts').should('be.visible');
      cy.byTestId('onboarding-kpi-total-brands').should('not.exist');
      cy.byTestId('onboarding-meeting-tile-ECOMM').should('not.exist');
      cy.byTestId('onboarding-status-card-ecomm-brands').should('not.exist');
    });
  });
});
