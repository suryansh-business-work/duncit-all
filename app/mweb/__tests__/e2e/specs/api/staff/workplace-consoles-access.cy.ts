/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { ACCESS_DENIED, expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectPortalRefused } from '../../../support/api-partners';
import { asRole, call, expectCallsRefused, expectOutsidersRefused, NO_ID } from '../../../support/api-staff';
import { runAccount } from '../../../support/run-account';

/**
 * The workplace consoles — HR (hr.duncit.com), Employee (employee.duncit.com)
 * and Targets (targets.duncit.com) — and the Employee console's expense API.
 *
 * Each console's server login gate admits its own role only (SUPER_ADMIN passes
 * every gate): `hr` HR_MANAGER, `employee` EMPLOYEE, `targets` TARGETS_MANAGER
 * (portals/portal.constants.ts PORTAL_ROLE_REQUIREMENTS, asserted by
 * portals/portal.gate.ts assertPortalLogin). A sign-in code asked for a console
 * the account cannot open answers the same `{ ok: true }` a real one does, but
 * mints no code and sends no mail (access/user/user.credentials.ts
 * requestPortalLoginOtp) — read back through the OTP testing API.
 *
 * Every employee-expense call a claimant makes asks EMPLOYEE or SUPER_ADMIN
 * (finance/employeeExpense/employeeExpense.resolver.ts EMPLOYEE_RW) before it
 * reads or writes, so a well-formed claim from anyone else is refused and
 * nothing is filed. None of these roles can be granted to a run account, so the
 * signed-in halves of these flows (the welcome dashboards, filing a claim) are
 * not run here; FINANCE_USER stands in for the "Finance-only account" rows.
 *
 * Scenario map: HR › Console access and dashboard ("login refused for accounts
 * without HR_MANAGER", "Non-HR account is refused"); Employee › Console access
 * and dashboard ("login refused for accounts without EMPLOYEE", "protected
 * operations refuse other roles and anonymous callers"); Employee › My Expenses
 * (the server gate under every sub flow); Targets › Console access and
 * dashboard ("login refused for accounts without TARGETS_MANAGER"); Targets ›
 * Growth Calculator ("every operation refuses other roles and anonymous
 * callers") — growthCalculation.resolver.ts asks TARGETS_MANAGER or SUPER_ADMIN
 * before it reads, previews or writes anything.
 */

const CONSOLES = ['hr', 'employee', 'targets'] as const;
const OTHER_SEAT: E2eStaffRole = 'FINANCE_USER';

const REQUEST_CODE = `mutation E2eWorkplaceCode($input: PortalLoginOtpRequestInput!) {
  requestPortalLoginOtp(input: $input) { ok dev_otp }
}`;

/** A claim every server rule would accept — so a refusal can only be the role gate. */
const CLAIM = {
  date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  category: 'TRAVEL',
  amount: 1250,
  merchant: 'Uber',
  payment_method: 'UPI',
  description: 'E2E role-gate probe — must never be filed',
};

const EXPENSE_CALLS = [
  call('myEmployeeExpensesTable', `query E2eMyClaims { myEmployeeExpensesTable(query: { page_size: 1 }) { total } }`),
  call('myEmployeeExpenseSummary', `query E2eMyClaimTiles { myEmployeeExpenseSummary { __typename } }`),
  call('myEmployeeExpense', `query E2eMyClaim($id: ID!) { myEmployeeExpense(expense_doc_id: $id) { id } }`, { id: NO_ID }),
  call(
    'createEmployeeExpense',
    `mutation E2eFileClaim($input: EmployeeExpenseInput!) { createEmployeeExpense(input: $input) { id } }`,
    { input: CLAIM },
  ),
  call(
    'updateEmployeeExpense',
    `mutation E2eEditClaim($id: ID!, $input: EmployeeExpenseInput!) { updateEmployeeExpense(expense_doc_id: $id, input: $input) { id } }`,
    { id: NO_ID, input: CLAIM },
  ),
  call('deleteEmployeeExpense', `mutation E2eWithdrawClaim($id: ID!) { deleteEmployeeExpense(expense_doc_id: $id) }`, {
    id: NO_ID,
  }),
];

/** A plan every server rule would accept — so a refusal can only be the role gate. */
const GROWTH_INPUTS = {
  pax_per_pod: 10,
  price_per_pax: 400,
  profit_margin_pct: 20,
  hosts_per_venue: 2,
  pods_per_host_per_month: 2,
  venues_per_city: 100,
  target_cities: 10,
  host_conversion_pct: 10,
  venue_conversion_pct: 5,
};

const GROWTH_CALLS = [
  call('growthCalculationsTable', `query E2eGrowthTable { growthCalculationsTable(query: { page_size: 1 }) { total } }`),
  call('growthCalculation', `query E2eGrowthOne($id: ID!) { growthCalculation(id: $id) { id } }`, { id: NO_ID }),
  call(
    'growthCalculationPreview',
    `query E2eGrowthPreview($inputs: GrowthInputsInput!) { growthCalculationPreview(inputs: $inputs) { totals { monthly_gmv } } }`,
    { inputs: GROWTH_INPUTS },
  ),
  call(
    'saveGrowthCalculation',
    `mutation E2eGrowthSave($input: SaveGrowthCalculationInput!) { saveGrowthCalculation(input: $input) { id } }`,
    { input: { title: 'E2E role-gate probe — must never be saved', inputs: GROWTH_INPUTS } },
  ),
  call(
    'updateGrowthCalculation',
    `mutation E2eGrowthEdit($id: ID!, $input: UpdateGrowthCalculationInput!) { updateGrowthCalculation(id: $id, input: $input) { id } }`,
    { id: NO_ID, input: { title: 'E2E probe', inputs: GROWTH_INPUTS, expected_revision: 0 } },
  ),
  call(
    'duplicateGrowthCalculation',
    `mutation E2eGrowthCopy($id: ID!) { duplicateGrowthCalculation(id: $id, title: "E2E probe") { id } }`,
    { id: NO_ID },
  ),
  call('deleteGrowthCalculation', `mutation E2eGrowthDelete($id: ID!) { deleteGrowthCalculation(id: $id) }`, { id: NO_ID }),
];

describe('API · HR, Employee and Targets open only for their own role', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles([OTHER_SEAT]);
  });

  it('WC-01 a member is refused the HR, Employee and Targets sign-ins', () => {
    cy.useRunTraffic();
    CONSOLES.forEach((portal) => expectPortalRefused(portal));
  });

  it('WC-02 a Finance seat is refused the HR, Employee and Targets sign-ins', () => {
    asRole(OTHER_SEAT, () => CONSOLES.forEach((portal) => expectPortalRefused(portal)));
  });

  it('WC-03 a sign-in code for a console the account cannot open answers ok, mints nothing and sends nothing', () => {
    const { email } = runAccount();
    cy.useRunTraffic();
    let issuedBefore = '';
    cy.lastOtpIssuedAt('PORTAL_LOGIN', { email }).then((issuedAt) => {
      issuedBefore = issuedAt;
    });
    CONSOLES.forEach((portal) => {
      cy.gqlRaw(REQUEST_CODE, { input: { email, portal_key: portal } }, { token: null }).then((body) => {
        expect(body.errors, `${portal} code request errors`).to.be.undefined;
        expect(body.data?.requestPortalLoginOtp, `${portal} code request`).to.deep.equal({ ok: true, dev_otp: null });
      });
    });
    cy.lastOtpIssuedAt('PORTAL_LOGIN', { email }).then((issuedAt) => {
      expect(issuedAt, 'no portal sign-in code was minted').to.equal(issuedBefore);
    });
  });

  it('WC-04 every claim operation is refused signed out, and a well-formed claim from a member is refused unfiled', () => {
    EXPENSE_CALLS.forEach((c) => {
      cy.gqlRaw(c.query, c.variables, { token: null }).then((body) => expectRefused(c.field, body, SIGNED_OUT));
      cy.gqlRaw(c.query, c.variables, { token: memberToken }).then((body) =>
        expectRefused(c.field, body, ACCESS_DENIED),
      );
    });
  });

  it('WC-05 a Finance seat cannot file, edit, withdraw or list claims as an employee', () => {
    asRole(OTHER_SEAT, (token) => expectCallsRefused(token, EXPENSE_CALLS));
  });

  it('WC-06 every Growth Calculator operation is refused signed out and to a member, and nothing is saved', () => {
    expectOutsidersRefused(memberToken, GROWTH_CALLS);
  });

  it('WC-07 a Finance seat cannot list, preview, save, edit, duplicate or delete growth calculations', () => {
    asRole(OTHER_SEAT, (token) => expectCallsRefused(token, GROWTH_CALLS));
  });
});
