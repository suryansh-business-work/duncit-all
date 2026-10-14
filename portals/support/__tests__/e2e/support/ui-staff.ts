import {
  E2E_GRANT_ROLES_MUTATION,
  E2E_REVOKE_ROLES_MUTATION,
  E2E_TRAFFIC_HEADER,
  runMarker,
  type E2eStaffRole,
} from '@duncit/utils';
import { openLogin } from './login-page';
import { LOGIN_MUTATION } from './operations';
import { portalTokenKey, type StaffPortal } from './portals';
import { grantStaffRoles, runAccount, type RunAccount } from './run-account';

/**
 * Shared steps for the per-module UI specs under specs/<portal>/.
 *
 * Every one of those specs is self-contained: Cypress runs them after the
 * numbered specs, but a spec may be run on its own (or the numbered ones may
 * fail), so each `before()` grants the three portal roles again — granting a
 * role the account already holds changes nothing. A spec that takes a role away
 * to prove a refusal, or grants an extra one, puts the account back in its own
 * `after()` with `restoreStaffRoles`.
 *
 * The suite's own commands throw on a GraphQL error; a refusal is the expected
 * answer here, so `gqlRaw` posts without throwing and yields the whole body.
 */

export interface GqlError {
  message: string;
  extensions?: { code?: string };
}

export interface GqlBody<T = Record<string, unknown>> {
  data?: T | null;
  errors?: GqlError[];
}

/** What `requireRole` answers (server/src/middleware/rbac.ts). */
export const ACCESS_DENIED = 'Access Denied';

/** What `assertPortalLogin` answers (server/src/modules/portals/portal.gate.ts). */
export const PORTAL_REFUSED = 'You do not have access to this portal';

/** `shell.login.accessDenied`, with each portal's `appConfig.fullName`. */
export const deniedBanner = (fullName: string): string =>
  `You do not have access to ${fullName}. Please contact your administrator.`;

/** The run account, holding the three portal roles — every UI spec's first step. */
export function staffAccount(): RunAccount {
  const account = runAccount();
  grantStaffRoles(account);
  return account;
}

/** A marker for what one spec files itself: `[E2E <stamp> <surface>]`. */
export const specMarker = (account: RunAccount, surface: string): string => runMarker(account.stamp, surface);

const roleInput = (account: RunAccount, roles: readonly E2eStaffRole[]) => ({
  input: { stamp: account.stamp, email: account.email, roles: [...roles] },
});

/** Take roles away from the run account (server e2eRun.staff.ts). */
export function revokeRoles(account: RunAccount, roles: readonly E2eStaffRole[]): void {
  cy.staffGql<{ revokeE2eRunAccountRoles: string[] }>(E2E_REVOKE_ROLES_MUTATION, roleInput(account, roles))
    .its('revokeE2eRunAccountRoles')
    .then((left: string[]) => {
      for (const role of roles) expect(left, `the run account no longer holds ${role}`).to.not.include(role);
    });
}

/** Give the run account extra limited roles for one spec. */
export function grantRoles(account: RunAccount, roles: readonly E2eStaffRole[]): void {
  cy.staffGql<{ grantE2eRunAccountRoles: string[] }>(E2E_GRANT_ROLES_MUTATION, roleInput(account, roles))
    .its('grantE2eRunAccountRoles')
    .should('include.members', [...roles]);
}

/**
 * Hand the account back as the next spec expects it: the extra roles this spec
 * granted gone, the three portal roles held.
 */
export function restoreStaffRoles(account: RunAccount, extra: readonly E2eStaffRole[] = []): void {
  if (extra.length > 0) revokeRoles(account, extra);
  grantStaffRoles(account);
}

/** POST one operation as `portal` and yield the body, errors included. */
export function gqlRaw<T = Record<string, unknown>>(
  portal: StaffPortal,
  query: string,
  variables: Record<string, unknown>,
  token: string | null,
): Cypress.Chainable<GqlBody<T>> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-duncit-surface': 'PORTAL',
    'x-duncit-app': portal,
  };
  if (token) headers.authorization = `Bearer ${token}`;
  // The key commands.ts keeps for `useRunTraffic`, so a refused sign-in is not
  // counted against the login rate limit either.
  const traffic = Cypress.env('__trafficKey') as string | undefined;
  if (traffic) headers[E2E_TRAFFIC_HEADER] = traffic;
  return cy
    .request<GqlBody<T>>({
      method: 'POST',
      url: String(Cypress.env('GRAPHQL_URL')),
      headers,
      body: { query, variables },
      failOnStatusCode: false,
      log: false,
    })
    .its('body');
}

/** The first error must be exactly `message`, and `field` must carry no data. */
export function expectRefused(body: GqlBody, field: string, message: string): void {
  const [error] = body.errors ?? [];
  expect(error, `${field} must answer with an error`).to.exist;
  expect(error?.message, `${field} error message`).to.equal(message);
  expect(body.data?.[field] ?? null, `${field} must return no data`).to.be.null;
}

/** The password sign-in as `portal`, through the API, without throwing. */
export const apiLoginRaw = (portal: StaffPortal, account: RunAccount) =>
  gqlRaw<{ login: { token: string } | null }>(
    portal,
    LOGIN_MUTATION,
    { input: { email: account.email, password: account.password('CHANGED'), portal_key: portal } },
    null,
  );

/**
 * Sign in on the portal's own login screen and see it refused: the server's
 * sentence in the error alert, no session stored, still on /login.
 */
export function expectUiLoginRefused(portal: StaffPortal, account: RunAccount): void {
  openLogin(portal);
  cy.byTestId('field-email').clear().type(account.email);
  cy.byTestId('field-password').clear().type(account.password('CHANGED'), { log: false });
  cy.interceptOperation('ConsoleLogin');
  cy.byTestId('login-submit').click();
  cy.wait('@ConsoleLogin').its('response.body.errors.0.message').should('eq', PORTAL_REFUSED);
  cy.byTestId('login-error').should('contain.text', PORTAL_REFUSED);
  cy.location('pathname').should('eq', '/login');
  cy.window().its('localStorage').invoke('getItem', portalTokenKey(portal)).should('equal', null);
}

/** `/login?denied=1` — where the shell sends a session that lost its role. */
export function expectDeniedBanner(portal: StaffPortal, fullName: string): void {
  cy.clearAuth();
  cy.visitPortal(portal, '/login?denied=1');
  cy.byTestId('login-error').should('have.text', deniedBanner(fullName));
}

/** The empty-state line DuncitTable shows once a query answers no rows. */
export function expectTableEmpty(text: string): void {
  cy.byTestId('duncit-table-empty').should('have.text', text);
}

/** Open a MUI select by its TextField's test id and pick an option by its test id. */
export function pickOption(selectTestId: string, optionTestId: string): void {
  cy.byTestId(selectTestId).find('[role="combobox"]').click();
  cy.byTestId(optionTestId).click();
}

/** The value a MUI select shows. */
export function selectShows(selectTestId: string, text: string): void {
  cy.byTestId(selectTestId).find('[role="combobox"]').should('have.text', text);
}

/** A `notify()` toast (NotifyHost) of this severity, carrying `text`. */
export function expectNotify(severity: 'success' | 'error' | 'info' | 'warning', text: string): void {
  cy.byTestId(`notify-${severity}`).should('contain.text', text);
}

/** The shared ConfirmDialog, open with this title. */
export function expectConfirm(title: string): void {
  cy.byTestId('confirm-dialog').should('be.visible');
  cy.byTestId('confirm-dialog-title').should('have.text', title);
}

/**
 * Wide enough that AG Grid draws every column: it only renders the columns in
 * view, so a row action at the far right of a wide table is not in the DOM at
 * the default 1280px.
 */
export function wideViewport(): void {
  cy.viewport(2560, 1200);
}

/** How many requests carrying this operation the page has sent since the call. */
export interface OperationCount {
  calls: number;
}

/** Count an operation from now on — for "this was never sent". */
export function countOperation(name: string): OperationCount {
  const seen: OperationCount = { calls: 0 };
  cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
    if ((req.body as { operationName?: string } | undefined)?.operationName === name) seen.calls += 1;
  });
  return seen;
}

/** Nothing carrying the counted operation went to the server. */
export function expectNotSent(seen: OperationCount, name: string): void {
  cy.wrap(seen, { log: false }).its('calls').should('eq', 0, `${name} must not be sent`);
}

/** The file Cypress saved under the downloads folder. */
export const downloaded = (fileName: string): string =>
  `${String(Cypress.config('downloadsFolder'))}/${fileName}`;

/** `slugify` in portals/legal/src/lib/slug.ts — what the New policy dialog derives from a title. */
export const slugOf = (title: string): string =>
  title
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');

// ------------------------------------------------------------ Legal records

/** File a policy directly (the specs that are not about the New policy dialog). */
export const CREATE_POLICY_API = `mutation E2eCreatePolicy($input: CreatePolicyInput!) {
  createPolicy(input: $input) { id title slug }
}`;

export const UPDATE_POLICY_API = `mutation E2eUpdatePolicy($id: ID!, $input: UpdatePolicyInput!) {
  updatePolicy(policy_doc_id: $id, input: $input) { id }
}`;

const POLICIES_LOOKUP = `query E2ePoliciesLookup($query: TableQueryInput) {
  policiesTable(query: $query) { rows { id title } }
}`;

const DELETE_POLICY_API = `mutation E2eDeletePolicy($id: ID!) { deletePolicy(policy_doc_id: $id) }`;

/** Remove every policy whose title carries the marker. */
export function deleteMarkedPolicies(marker: string): void {
  cy.gql<{ policiesTable: { rows: { id: string; title: string }[] } }>(POLICIES_LOOKUP, {
    query: { search: marker, page: 1, page_size: 50 },
  }).then((data) => {
    for (const row of data.policiesTable.rows.filter((r) => r.title.includes(marker))) {
      cy.gql(DELETE_POLICY_API, { id: row.id });
    }
  });
}

/** A hidden, non-signup policy filed for one scenario. */
export function createHiddenPolicy(title: string, content: string): Cypress.Chainable<{ id: string; title: string }> {
  return cy
    .gql<{ createPolicy: { id: string; title: string } }>(CREATE_POLICY_API, {
      input: { title, slug: slugOf(title), content, is_active: false, requires_signup_acceptance: false },
    })
    .then((data) => data.createPolicy);
}

export const CREATE_DOCUMENT_API = `mutation E2eCreateLegalDocument($input: CreateLegalDocumentInput!) {
  createLegalDocument(input: $input) { id name }
}`;

const DOCUMENTS_LOOKUP = `query E2eLegalDocumentsLookup($query: TableQueryInput) {
  legalDocumentsTable(query: $query) { rows { id name } }
}`;

const DELETE_DOCUMENT_API = `mutation E2eDeleteLegalDocument($id: ID!) { deleteLegalDocument(id: $id) }`;

/** A legal document filed for one scenario (documents are internal — no app reads them). */
export function createDocument(name: string, content = '<p>Filed by the staff portals suite.</p>') {
  return cy
    .gql<{ createLegalDocument: { id: string; name: string } }>(CREATE_DOCUMENT_API, {
      input: { name, document_type: 'Vendor Agreement', description: '', content },
    })
    .then((data) => data.createLegalDocument);
}

/** Remove every document (clones included — "Copy of <name>") carrying the marker. */
export function deleteMarkedDocuments(marker: string): void {
  cy.gql<{ legalDocumentsTable: { rows: { id: string; name: string }[] } }>(DOCUMENTS_LOOKUP, {
    query: { search: marker, page: 1, page_size: 50 },
  }).then((data) => {
    for (const row of data.legalDocumentsTable.rows.filter((r) => r.name.includes(marker))) {
      cy.gql(DELETE_DOCUMENT_API, { id: row.id });
    }
  });
}
