import { E2E_GRANT_ROLES_MUTATION, E2E_REVOKE_ROLES_MUTATION, type E2eStaffRole } from '@duncit/utils';
import type { GqlBody } from './commands';
import { runAccount } from './run-account';
import { STAFF_OPERATIONS, type StaffArea } from './staff-operations';

/**
 * Shared steps for the API access specs (specs/api/**): who is calling, and
 * what a refusal has to look like.
 */

export interface Refusal {
  code: string;
  message: string;
}

/** `requireAuth` in server/src/middleware/rbac.ts. */
export const SIGNED_OUT: Refusal = { code: 'UNAUTHENTICATED', message: 'Not authenticated' };
/** The venue, host and pod-member resolvers' own signed-in check (`uid()` / `requireUser`). */
export const AUTH_REQUIRED: Refusal = { code: 'UNAUTHENTICATED', message: 'Authentication required' };
/** `requireRole` in server/src/middleware/rbac.ts. */
export const ACCESS_DENIED: Refusal = { code: 'FORBIDDEN', message: 'Access Denied' };

const ME_ROLES = `query E2eMeRoles { me { roles } }`;

/** The server's first error must be exactly `expected`, and `field` must carry no data. */
export function expectRefused(field: string, body: GqlBody, expected: Refusal): void {
  const [error] = body.errors ?? [];
  expect(error, `${field} must answer with an error`).to.exist;
  expect(error.extensions?.code, `${field} error code`).to.equal(expected.code);
  expect(error.message, `${field} error message`).to.equal(expected.message);
  // A refusal that still carried rows or a written record would be a leak.
  expect(body.data?.[field] ?? null, `${field} must return no data`).to.be.null;
}

/**
 * Sign the run account in (stage CHANGED — these specs run after 07) and prove
 * it holds nothing but USER: a refusal only means something from a caller known
 * to have no other role. The run's traffic key is fetched first so the sign-in
 * is not counted against the login rate limit.
 */
export function signInRunMember(): Cypress.Chainable<string> {
  const account = runAccount();
  cy.useRunTraffic();
  return cy.apiLogin(account.email, account.password('CHANGED')).then((token) =>
    cy.gql<{ me: { roles: string[] } }>(ME_ROLES, {}, { token }).then((data) => {
      expect(data.me.roles, 'the run account is a plain member').to.deep.equal(['USER']);
      return token;
    }),
  );
}

const rolesInput = (roles: readonly E2eStaffRole[]) => {
  const account = runAccount();
  return { input: { stamp: account.stamp, email: account.email, roles } };
};

/**
 * Give the run account `roles` (server e2eRun.staff.ts — limited staff and
 * partner roles only) and sign in again for a token that carries them. Pair it
 * with `revokeRunRoles` in `after()`, so the next spec finds a plain member.
 */
export function signInRunAs(roles: readonly E2eStaffRole[]): Cypress.Chainable<string> {
  const account = runAccount();
  cy.useRunTraffic();
  cy.staffGql(E2E_GRANT_ROLES_MUTATION, rolesInput(roles));
  return cy.apiLogin(account.email, account.password('CHANGED')).then((token) =>
    cy.gql<{ me: { roles: string[] } }>(ME_ROLES, {}, { token }).then((data) => {
      expect(data.me.roles, 'the run account holds the granted roles').to.include.members([...roles]);
      return token;
    }),
  );
}

/** Take back what `signInRunAs` granted. */
export function revokeRunRoles(roles: readonly E2eStaffRole[]): void {
  cy.staffGql(E2E_REVOKE_ROLES_MUTATION, rolesInput(roles));
}

/** One scenario per staff operation of `area`: refused signed out, refused for a member. */
export function itRefusesStaffOperations(area: StaffArea, memberToken: () => string): void {
  const operations = STAFF_OPERATIONS.filter((op) => op.area === area);
  if (operations.length === 0) throw new Error(`No staff operations are listed for ${area}.`);
  operations.forEach((op) => {
    it(`${op.id} ${op.field} refuses a signed-out caller and a member`, () => {
      cy.gqlRaw(op.query, op.variables, { token: null }).then((body) => expectRefused(op.field, body, SIGNED_OUT));
      cy.gqlRaw(op.query, op.variables, { token: memberToken() }).then((body) =>
        expectRefused(op.field, body, ACCESS_DENIED),
      );
    });
  });
}
