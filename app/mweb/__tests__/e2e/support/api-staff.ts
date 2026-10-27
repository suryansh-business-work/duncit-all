import type { E2eStaffRole } from '@duncit/utils';
import { ACCESS_DENIED, expectRefused, revokeRunRoles, signInRunAs, type Refusal } from './access-steps';
import { NO_ID } from './staff-operations';

/**
 * Shared steps for the staff ROLE-MATRIX specs (specs/api/staff/<module>.cy.ts):
 * the run account is granted one limited staff role at a time, proven to hold
 * exactly that role, and checked against what the server lets that role do.
 *
 * Writes are only ever asserted as REFUSALS, with ids no record has (NO_ID) or
 * inputs every guard named below rejects before it touches a row. An allowed
 * call is only ever a read with no side effect.
 */

export { NO_ID };

/** `outOfScope` in server/src/modules/finance/financeScope.ts — city/zone-bound admins on money writes. */
export const OUT_OF_SCOPE: Refusal = {
  code: 'FORBIDDEN',
  message: 'This is outside the city or zone you administer',
};

/** `assertPlatformFinanceWrite` in server/src/modules/finance/financeScope.ts. */
export const PLATFORM_FINANCE_ONLY: Refusal = {
  code: 'FORBIDDEN',
  message: 'Only Finance or a super admin can change platform-wide finance settings',
};

/** `assertScope` in server/src/middleware/rbac.ts. */
export const OUT_OF_CITY: Refusal = { code: 'FORBIDDEN', message: 'Out of city scope' };

export interface StaffCall {
  /** The root field — the one `data` must not carry on a refusal. */
  field: string;
  query: string;
  variables?: Record<string, unknown>;
}

export const call = (field: string, query: string, variables?: Record<string, unknown>): StaffCall => ({
  field,
  query,
  variables,
});

const byId = { id: NO_ID };

/** Calls more than one module's spec makes; each was checked against its resolver and SDL. */
export const CALLS = {
  dashboardTotals: call('dashboardTotals', `query E2eDashboardTotals { dashboardTotals { users_total } }`),
  updateBranding: call('updateBranding', `mutation E2eUpdateBranding { updateBranding(input: {}) { __typename } }`),
  usersTable: call('usersTable', `query E2eUsersTable { usersTable(query: { page_size: 1 }) { total } }`),
  updateUser: call('updateUser', `mutation E2eUpdateUser($id: ID!) { updateUser(user_id: $id, input: {}) { __typename } }`, byId),
  deleteUser: call('deleteUser', `mutation E2eDeleteUser($id: ID!) { deleteUser(user_id: $id) }`, byId),
  financeSettings: call('financeSettings', `query E2eFinanceSettings { financeSettings { __typename } }`),
  paymentsTable: call('paymentsTable', `query E2ePaymentsTable { paymentsTable(query: { page_size: 1 }) { total } }`),
  userRefundsTable: call('userRefundsTable', `query E2eUserRefundsTable { userRefundsTable(query: { page_size: 1 }) { total } }`),
  refundPayment: call(
    'refundPayment',
    `mutation E2eRefundPayment($id: ID!) { refundPayment(payment_doc_id: $id, reason: "e2e") { __typename } }`,
    byId,
  ),
  retryPaymentSteps: call(
    'retryPaymentSteps',
    `mutation E2eRetryPaymentSteps($id: ID!) { retryPaymentSteps(payment_doc_id: $id) { __typename } }`,
    byId,
  ),
  approvePodPaymentRelease: call(
    'approvePodPaymentRelease',
    `mutation E2eApproveRelease($id: ID!) { approvePodPaymentRelease(id: $id) { __typename } }`,
    byId,
  ),
  reviewPaymentReleaseRequest: call(
    'reviewPaymentReleaseRequest',
    `mutation E2eReviewRelease($id: ID!) { reviewPaymentReleaseRequest(request_id: $id, input: { status: REJECTED }) { __typename } }`,
    byId,
  ),
  reviewWithdrawal: call(
    'reviewWithdrawal',
    `mutation E2eReviewWithdrawal($id: ID!) { reviewWithdrawal(withdrawal_id: $id, input: { status: REJECTED }) { __typename } }`,
    byId,
  ),
  deleteCoupon: call('deleteCoupon', `mutation E2eDeleteCoupon($id: ID!) { deleteCoupon(id: $id) }`, byId),
  tickets: call('tickets', `query E2eTickets { tickets(page_size: 1) { total } }`),
  communicationLogs: call('communicationLogs', `query E2eCommsLogs { communicationLogs(limit: 1) { total } }`),
} as const;

const ME_ROLES = `query E2eStaffMeRoles { me { roles } }`;

/**
 * Sign in holding USER and `role` and nothing else, run `check` with that
 * token, then hand the role back — so the next check (or spec) starts from a
 * plain member. A refusal only means something from a caller known to hold
 * exactly the role under test.
 */
export function asRole(role: E2eStaffRole, check: (token: string) => void): void {
  signInRunAs([role]).then((token) => {
    cy.gql<{ me: { roles: string[] } }>(ME_ROLES, {}, { token }).then((data) => {
      expect([...data.me.roles].sort(), 'the run account holds USER and this role only').to.deep.equal(
        ['USER', role].sort(),
      );
    });
    check(token);
  });
  revokeRunRoles([role]);
}

/** Every call answers `token` with `expected` (Access Denied unless named). */
export function expectCallsRefused(token: string, calls: readonly StaffCall[], expected: Refusal = ACCESS_DENIED): void {
  calls.forEach((c) => {
    cy.gqlRaw(c.query, c.variables ?? {}, { token }).then((body) => expectRefused(c.field, body, expected));
  });
}

/** Each role in turn is refused every call. */
export function expectRolesRefused(
  roles: readonly E2eStaffRole[],
  calls: readonly StaffCall[],
  expected: Refusal = ACCESS_DENIED,
): void {
  roles.forEach((role) => asRole(role, (token) => expectCallsRefused(token, calls, expected)));
}

/** A side-effect-free read `token` is allowed: no error, and the field carries data. Yields that data. */
export function expectRead<T = Record<string, unknown>>(token: string, c: StaffCall): Cypress.Chainable<T> {
  return cy.gqlRaw(c.query, c.variables ?? {}, { token }).then((body) => {
    expect(body.errors, `${c.field} must answer without an error`).to.be.undefined;
    const value = body.data?.[c.field];
    expect(value, `${c.field} must carry data`).to.exist;
    // Wrapped, so `then` yields the generic `T` rather than Cypress's ThenReturn union.
    return cy.wrap(value as T, { log: false });
  });
}

/** A table read `token` is allowed: no error and a whole-number total. */
export function expectTableRead(token: string, c: StaffCall): void {
  expectRead<{ total: number }>(token, c).then((page) => {
    expect(page.total, `${c.field} total`).to.be.a('number').and.to.be.at.least(0);
  });
}
