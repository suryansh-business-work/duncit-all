import { openTable, tableRow } from '../../support/tables';
import {
  adminRun,
  expectFieldError,
  fieldInput,
  longText,
  releaseAdmin,
  signInAdmin,
  type AdminRun,
} from '../../support/ui-admin-1';
import { countOperation, expectNotSent, expectTableEmpty } from '../../support/ui-staff';

/**
 * Admin › Membership (/membership/plans, /membership/subscribers): the tier
 * catalogue and comparison rows the apps render while membership is "coming
 * soon", and the members who asked to be told when it opens. SUPER_ADMIN and
 * CITY_ADMIN only (membership.resolver.ts ADMIN_WRITE).
 *
 * The tiers and rows are live platform content every member sees, so the spec
 * changes none of them: it opens the tabs, reads the tables against the server,
 * and drives both forms to their validation.
 */

const PLANS = `query E2eAdminMembershipPlans { membershipPlans { id key name is_active } }`;

const SUBSCRIBERS = `query E2eAdminMembershipSubscribers($query: TableQueryInput) {
  membershipNewsSubscribersTable(query: $query) { total rows { id email } }
}`;

interface Plan {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
}

const activePlans = (): Cypress.Chainable<Plan[]> =>
  cy.gql<{ membershipPlans: Plan[] }>(PLANS).then(({ membershipPlans }) => {
    const active = membershipPlans.filter((p) => p.is_active);
    if (active.length === 0) throw new Error('Staging has no active membership tier: the comparison-row scenarios need one.');
    return active;
  });

describe('Admin · Membership (City Admin)', () => {
  let run: AdminRun;

  before(() => {
    adminRun(['CITY_ADMIN']).then((r) => {
      run = r;
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('MEM-01 Plans opens on Tiers, listing every tier the server holds; ?selectedtab=BENEFITS opens Comparison rows', () => {
    cy.gql<{ membershipPlans: Plan[] }>(PLANS).then(({ membershipPlans }) => {
      openTable('admin', '/membership/plans', 'MembershipPlansTable');
      cy.byTestId('membership-plan-new').should('be.visible');
      if (membershipPlans.length === 0) expectTableEmpty('No tiers yet. Click "New tier" to create one.');
      for (const plan of membershipPlans.slice(0, 10)) tableRow('admin-membership-plans', plan.id, [plan.name, plan.key]);
    });

    openTable('admin', '/membership/plans?selectedtab=BENEFITS', 'MembershipBenefitsTable');
    cy.location('search').should('eq', '?selectedtab=BENEFITS');
    cy.byTestId('membership-benefit-new').should('be.visible');
    cy.byTestId('membership-plan-new').should('not.exist');
  });

  it('MEM-02 the tier form refuses a blank key and name, a key with capitals or spaces, and a colour that is not hex — before it sends', () => {
    const creates = countOperation('CreateMembershipPlan');
    openTable('admin', '/membership/plans', 'MembershipPlansTable');
    cy.byTestId('membership-plan-new').click();
    cy.byTestId('plan-form-dialog').should('contain.text', 'New tier');
    cy.byTestId('plan-form-submit').click();
    expectFieldError('plan-form-key', 'Key is required');
    expectFieldError('plan-form-name', 'Name is required');

    fieldInput('plan-form-key').type('Elite Tier').blur();
    expectFieldError('plan-form-key', 'Key may contain lowercase letters, digits, dashes and underscores');
    fieldInput('plan-form-name').type(longText(61), { delay: 0 }).blur();
    expectFieldError('plan-form-name', 'Name must be 60 characters or fewer');
    fieldInput('plan-form-accent').type('red').blur();
    expectFieldError('plan-form-accent', 'Use a hex colour like #B4532A, or leave blank');

    cy.byTestId('plan-form-submit').click();
    cy.byTestId('plan-form-dialog').should('be.visible');
    cy.byTestId('plan-form-cancel').click();
    cy.byTestId('plan-form-dialog').should('not.exist');
    expectNotSent(creates, 'CreateMembershipPlan');
  });

  it('MEM-03 the comparison-row form offers one cell per active tier and requires a section and a benefit', () => {
    const creates = countOperation('CreateMembershipBenefit');
    activePlans().then((plans) => {
      openTable('admin', '/membership/plans?selectedtab=BENEFITS', 'MembershipBenefitsTable');
      cy.byTestId('membership-benefit-new').click();
      cy.byTestId('benefit-form-dialog').should('contain.text', 'New benefit row');
      for (const plan of plans) cy.byTestId(`benefit-form-cell-${plan.key}`).should('contain.text', plan.name);
      cy.byTestIdPrefix('benefit-form-cell-').should('have.length', plans.length);
      cy.byTestId('benefit-form-submit').should('be.enabled').click();
      expectFieldError('benefit-form-group', 'Section is required');
      expectFieldError('benefit-form-label', 'Benefit is required');
      cy.byTestId('benefit-form-cancel').click();
      cy.byTestId('benefit-form-dialog').should('not.exist');
    });
    expectNotSent(creates, 'CreateMembershipBenefit');
  });

  it('MEM-04 an over-long tier cell is named under that cell', () => {
    activePlans().then(([plan]) => {
      openTable('admin', '/membership/plans?selectedtab=BENEFITS', 'MembershipBenefitsTable');
      cy.byTestId('membership-benefit-new').click();
      fieldInput('benefit-form-group').type('Section');
      fieldInput('benefit-form-label').type('Benefit');
      fieldInput(`benefit-form-cell-${plan.key}`).type(longText(61), { delay: 0 });
      cy.byTestId('benefit-form-submit').click();
      expectFieldError(`benefit-form-cell-${plan.key}`, 'Each cell must be 60 characters or fewer');
    });
  });

  it('MEM-05 Subscribers lists the members who asked to hear when membership opens, newest first, as the server holds them', () => {
    cy.gql<{ membershipNewsSubscribersTable: { total: number; rows: { id: string; email: string }[] } }>(SUBSCRIBERS, {
      query: { page: 1, page_size: 10, sort_by: 'created_at', sort_dir: 'desc' },
    }).then(({ membershipNewsSubscribersTable: page }) => {
      openTable('admin', '/membership/subscribers', 'MembershipNewsSubscribersTable');
      cy.get('@MembershipNewsSubscribersTable')
        .its('request.body.variables.query')
        .should('include', { sort_by: 'created_at', sort_dir: 'desc' });
      if (page.total === 0) expectTableEmpty('Nobody has signed up for membership news yet.');
      for (const row of page.rows) tableRow('admin-membership-subscribers', row.id, [row.email]);
    });
  });
});
