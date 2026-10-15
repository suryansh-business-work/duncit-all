import type { RunAccount } from '../../support/run-account';
import {
  ACCESS_DENIED,
  PORTAL_REFUSED,
  apiLoginRaw,
  expectDeniedBanner,
  expectRefused,
  expectUiLoginRefused,
  gqlRaw,
  grantRoles,
  revokeRoles,
} from '../../support/ui-staff';
import {
  ONBOARDING_ROLE,
  onboardingAccount,
  productsVisible,
  releaseOnboarding,
  signInOnboarding,
} from '../../support/ui-onboarding';

/**
 * Onboarding · Access & navigation: who may open onboarding.duncit.com, the
 * sidebar (src/config/app-config.ts nav, minus the e-commerce entries while
 * `is_product_visible` is off — src/config/ecomm-nav.ts) and the catch-all
 * route (App.tsx `*` → `/`).
 *
 * The flag is a platform setting the suite never flips: each scenario reads it
 * and asserts the side staging is on.
 */

const LEAVES = [
  '/',
  '/surveys',
  '/meetings/calendar',
  '/meetings/venue',
  '/meetings/host',
  '/meetings/club_admin',
  '/meetings/availability',
  '/host-requests',
  '/hosts',
  '/venues',
  '/club-admins',
  '/settings',
];
const ECOMM_LEAVES = ['/meetings/ecomm', '/ecomm-brands'];

const SURVEYS_PAGE = `query E2eOnboardingSurveysPage { surveysTable(query: { page: 1, page_size: 1 }) { total } }`;

const navLeaf = (to: string) => cy.get(`[data-testid="shell-nav-leaf"][href="${to}"]`);

/** On `/` no group is active, so every group starts closed; open each once. */
function openAllNavGroups(): void {
  cy.byTestId('shell-nav-group').each(($group) => {
    cy.wrap($group).should('have.attr', 'aria-expanded', 'false').click();
    cy.wrap($group).should('have.attr', 'aria-expanded', 'true');
  });
}

describe('Onboarding · Access & navigation (run account, password CHANGED)', () => {
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

  it('OAN-01 the sidebar lists every onboarding area, and Meeting Availability opens its page', () => {
    signInOnboarding(account);
    cy.visitPortal('onboarding', '/');
    cy.byTestId('onboarding-dashboard-title').should('contain.text', 'Welcome back');
    openAllNavGroups();
    for (const to of LEAVES) navLeaf(to).should('exist');
    navLeaf('/meetings/availability').click();
    cy.location('pathname').should('eq', '/meetings/availability');
    cy.byTestId('availability-save').should('be.visible');
  });

  it('OAN-02 the e-commerce entries follow is_product_visible: listed and open while on, gone and /ecomm-brands sent home while off', () => {
    signInOnboarding(account);
    cy.visitPortal('onboarding', '/');
    cy.byTestId('onboarding-dashboard-title').should('be.visible');
    openAllNavGroups();
    for (const to of ECOMM_LEAVES) navLeaf(to).should(ecommOn ? 'exist' : 'not.exist');

    cy.interceptOperation('EcommBrandsTable');
    cy.visitPortal('onboarding', '/ecomm-brands');
    if (ecommOn) {
      cy.wait('@EcommBrandsTable').its('response.body.errors').should('be.undefined');
      cy.location('pathname').should('eq', '/ecomm-brands');
    } else {
      cy.location('pathname').should('eq', '/');
      cy.byTestId('onboarding-dashboard-title').should('be.visible');
    }
  });

  it('OAN-03 an unknown path inside the console falls back to the dashboard', () => {
    signInOnboarding(account);
    cy.visitPortal('onboarding', '/no-such-onboarding-page');
    cy.location('pathname').should('eq', '/');
    cy.byTestId('onboarding-dashboard-title').should('contain.text', 'Welcome back');
  });

  it('OAN-04 without ONBOARDING_MANAGER the sign-in is refused, another portal’s token cannot read surveys, and the denied banner names the console', () => {
    revokeRoles(account, [ONBOARDING_ROLE]);
    expectUiLoginRefused('onboarding', account);
    apiLoginRaw('onboarding', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    apiLoginRaw('support', account).then((body) => {
      const token = body.data?.login?.token ?? null;
      expect(token, 'the Support sign-in still works').to.be.a('string');
      gqlRaw('onboarding', SURVEYS_PAGE, {}, token).then((page) => expectRefused(page, 'surveysTable', ACCESS_DENIED));
    });
    expectDeniedBanner('onboarding', 'Duncit Onboarding');
    grantRoles(account, [ONBOARDING_ROLE]);
    apiLoginRaw('onboarding', account).its('data.login.token').should('be.a', 'string');
  });
});
