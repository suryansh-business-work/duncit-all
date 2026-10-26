import { E2E_GRANT_ROLES_MUTATION, type E2eStaffRole } from '@duncit/utils';
import type { StaffPortal } from './portals';
import type { RunAccount } from './run-account';
import { apiLoginRaw, gqlRaw, type GqlBody } from './ui-staff';

/**
 * Shared steps for the four directory consoles — Venues, Hosts, Clubs and Club
 * Admins (packages/entity-consoles, mounted by portals/<p>/src/main.tsx).
 *
 * Every write those consoles offer lands on a REAL partner's record, and the
 * consoles cannot delete one (deleteVenue / deleteHost / deleteClubAdminProfile
 * are SUPER_ADMIN / DEVELOPERS_MANAGER). So these specs never save: they prove
 * the gates, the reads, the navigation and the validation that stops a Save
 * before anything is sent, and the server's refusals — the last always on an id
 * nobody has, or on a request the server turns down before it writes.
 */

/** A Mongo id nothing has. */
export const ZERO_ID = '000000000000000000000000';

/**
 * The roles that GOVERN a directory record (server/src/modules/portals/console-access.ts).
 * A spec that relies on a refusal must not run while the account holds one —
 * the refused write would then go through on a real record.
 */
const PLATFORM_GOVERNORS = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'] as const;

/**
 * Grant the run account `roles` and check that, apart from what was asked for,
 * it holds no governor role. Fails loudly rather than letting a later scenario
 * write to a live venue because an earlier spec left CITY_ADMIN behind.
 */
export function grantConsoleRoles(account: RunAccount, roles: readonly E2eStaffRole[]): void {
  cy.staffGql<{ grantE2eRunAccountRoles: string[] }>(E2E_GRANT_ROLES_MUTATION, {
    input: { stamp: account.stamp, email: account.email, roles: [...roles] },
  })
    .its('grantE2eRunAccountRoles')
    .then((held: string[]) => {
      expect(held, 'the run account holds the console roles').to.include.members([...roles]);
      for (const role of PLATFORM_GOVERNORS) {
        expect(held, `the run account must not hold ${role} while these specs run`).to.not.include(role);
      }
      if (!roles.includes('ONBOARDING_MANAGER')) {
        expect(held, 'the run account must not hold ONBOARDING_MANAGER unless the spec asked for it').to.not.include(
          'ONBOARDING_MANAGER',
        );
      }
    });
}

/** A fresh session for `portal`, as the token the page will use. */
export function consoleLogin(portal: StaffPortal, account: RunAccount): Cypress.Chainable<string> {
  return cy.apiPortalLogin(portal, account.email, account.password('CHANGED'));
}

/** A Support token: an existing staff session that holds none of the directory roles. */
export function supportToken(account: RunAccount): Cypress.Chainable<string | null> {
  return apiLoginRaw('support', account).then((body) => {
    const token = body.data?.login?.token ?? null;
    expect(token, 'the Support sign-in still works').to.be.a('string');
    return cy.wrap<string | null>(token, { log: false });
  });
}

/** Post as `portal` with `token` and yield the body, errors included. */
export const rawAs = <T = Record<string, unknown>>(
  portal: StaffPortal,
  query: string,
  variables: Record<string, unknown>,
  token: string | null,
): Cypress.Chainable<GqlBody<T>> => gqlRaw<T>(portal, query, variables, token);

/** The four brief tiles every lifecycle console shows, by key → label (`directory.common.*`). */
export const LIFECYCLE_TILES: readonly { key: string; label: string; search: string }[] = [
  { key: 'total', label: 'Total', search: '' },
  { key: 'approved', label: 'Approved', search: '?status=APPROVED' },
  { key: 'pending', label: 'Awaiting review', search: '?status=SUBMITTED' },
  { key: 'declined', label: 'Declined', search: '?status=REJECTED' },
];

/** Click a brief tile and land on the list with its query string. */
export function openTile(portal: StaffPortal, key: string, listPath: string, search: string): void {
  cy.visitPortal(portal, '/');
  cy.byTestId(`directory-tile-${key}`).click();
  cy.location('pathname').should('eq', listPath);
  cy.location('search').should('eq', search);
}

/** The brief's tiles: each label, and a number once the counts query answered. */
export function expectTiles(counts: string, tiles: readonly { key: string; label: string }[]): void {
  cy.wait(`@${counts}`).its('response.body.errors').should('be.undefined');
  for (const tile of tiles) {
    cy.byTestId(`directory-tile-${tile.key}`).should('contain.text', tile.label);
  }
}

/** The `query` variable a table request carried. */
export const tableQuery = (interception: { request: { body: { variables?: { query?: unknown } } } }) =>
  interception.request.body.variables?.query as {
    search: string | null;
    page: number;
    page_size: number;
    sort_by: string | null;
    sort_dir: string;
    filters: { field: string; op: string; value: string | null }[];
  };

/** First rows of a table document, read through the API with the current session. */
export function firstRows<Row>(query: string, resultKey: string, page_size = 10): Cypress.Chainable<Row[]> {
  return cy
    .gql<Record<string, { rows: Row[] }>>(query, { query: { page: 1, page_size } })
    .then((data) => data[resultKey].rows);
}

/** A tab of a record, picked by its `<prefix>-tab-<value>` test id, and the URL that holds it. */
export function pickTab(prefix: string, value: string): void {
  cy.byTestId(`${prefix}-tab-${value}`).click();
  cy.location('search').should('contain', `selectedtab=${value}`);
  cy.byTestId(`${prefix}-tab-${value}`).should('have.attr', 'aria-selected', 'true');
}

/** The editor frame's form (EditorPageShell) shows every message given. */
export function editorShows(messages: readonly string[]): void {
  cy.byTestId('entity-editor').should(($form) => {
    for (const message of messages) expect($form).to.contain.text(message);
  });
}

/** Type into an RhfTextField by the test id on its root. */
export function typeInto(testId: string, text: string): void {
  cy.byTestId(testId).find('input').clear().type(text, { delay: 0 });
}

/** The governed status row (StatusFields) is read-only, with the note saying who sets it. */
export function expectGovernedReadOnly(moneyTestId: string, note: string): void {
  cy.byTestId('status-fields-governed').should('have.text', note);
  cy.byTestId('status-fields-status').find('[role="combobox"]').should('have.attr', 'aria-disabled', 'true');
  cy.byTestId('status-fields-active').find('input').should('be.disabled');
  cy.byTestId(moneyTestId).find('input').should('be.disabled');
}

/** The same row, open to a governor. */
export function expectGovernable(moneyTestId: string): void {
  cy.byTestId('status-fields-governed').should('not.exist');
  cy.byTestId('status-fields-status').find('[role="combobox"]').should('not.have.attr', 'aria-disabled');
  cy.byTestId('status-fields-active').find('input').should('be.enabled');
  cy.byTestId(moneyTestId).find('input').should('be.enabled');
}

/** `governedBy` in directory.venueEditor — the note all three editors show a console-role editor. */
export const GOVERNED_NOTE =
  'Approvals, the percentages and the live switch are set by platform admins and the onboarding desk. Everything else on this page is yours to edit.';
