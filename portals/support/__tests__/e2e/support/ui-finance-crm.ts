import type { E2eStaffRole } from '@duncit/utils';
import type { StaffPortal } from './portals';
import type { RunAccount } from './run-account';
import {
  ACCESS_DENIED,
  apiLoginRaw,
  countOperation,
  expectNotSent,
  expectRefused,
  gqlRaw,
  grantRoles,
  restoreStaffRoles,
  revokeRoles,
  staffAccount,
} from './ui-staff';

/**
 * Shared steps for the Finance, Logs, CRM and Communications UI specs
 * (specs/finance, specs/logs, specs/crm, specs/communications).
 *
 * Each console admits one limited role the e2e testing API may grant:
 * FINANCE_USER (the read-only Finance analyst seat — FINANCE_READER in
 * server/src/middleware/rbac.ts), LOGS_MANAGER, CRM_MANAGER and
 * COMMUNICATIONS_MANAGER. A spec takes the run account with the three portal
 * roles (`staffAccount`), adds its console's role, and hands it back in
 * `after()` with `releaseConsoleRole`.
 *
 * Finance is read-only for the analyst: every write a page offers is proven
 * REFUSED through the API with an id that names nothing (`ZERO_ID`) or an empty
 * input, so even a gate that wrongly let it through could change nothing.
 */

/** The limited role each of these consoles signs in with. */
export const CONSOLE_ROLE = {
  finance: 'FINANCE_USER',
  logs: 'LOGS_MANAGER',
  crm: 'CRM_MANAGER',
  communications: 'COMMUNICATIONS_MANAGER',
} as const satisfies Partial<Record<StaffPortal, E2eStaffRole>>;

export type ConsoleKey = keyof typeof CONSOLE_ROLE;

/** An ObjectId no record carries — what every refusal probe targets. */
export const ZERO_ID = '000000000000000000000000';

/** The run account holding the three portal roles plus this console's role. */
export function consoleAccount(portal: ConsoleKey): RunAccount {
  const account = staffAccount();
  grantRoles(account, [CONSOLE_ROLE[portal]]);
  return account;
}

/** Hand the account back as the next spec expects it: this console's role gone. */
export function releaseConsoleRole(account: RunAccount | undefined, portal: ConsoleKey): void {
  if (account) restoreStaffRoles(account, [CONSOLE_ROLE[portal]]);
}

/** Sign in to the console through the API so the next `visitPortal` boots signed in. */
export function signIn(portal: ConsoleKey, account: RunAccount): Cypress.Chainable<string> {
  return cy.apiPortalLogin(portal, account.email, account.password('CHANGED'));
}

interface OperationResponse<T> {
  errors?: { message: string }[];
  data?: T;
}

/**
 * Visit a console page and yield the `data` of the first `operation` it sends,
 * which must answer without an error — the read the page is built on.
 */
export function visitAndRead<T>(portal: ConsoleKey, path: string, operation: string): Cypress.Chainable<T> {
  cy.interceptOperation(operation);
  cy.visitPortal(portal, path);
  return cy.wait(`@${operation}`).then(({ response }) => {
    const body = response?.body as OperationResponse<T> | undefined;
    expect(body?.errors, `${operation} answers the ${CONSOLE_ROLE[portal]} seat`).to.be.undefined;
    return cy.wrap(body?.data as T, { log: false });
  });
}

/** The DuncitTable row the first record of the answer was drawn as, when there is one. */
export function expectFirstRow<R>(tableId: string, rows: readonly R[], rowId: (row: R) => string): void {
  if (rows.length === 0) return;
  cy.byTestId(`${tableId}-row-${rowId(rows[0])}`).should('be.visible');
}

/** Staging must hold at least one record for this scenario; say which when it does not. */
export function requireRows<R>(rows: readonly R[] | null | undefined, what: string): R[] {
  expect(rows ?? [], `staging holds ${what}`).to.have.length.greaterThan(0);
  return [...(rows ?? [])];
}

/** A fresh token for the console, signed with the account's current roles. */
export function consoleToken(portal: ConsoleKey, account: RunAccount): Cypress.Chainable<string> {
  return apiLoginRaw(portal, account).then((body) => {
    const token = body.data?.login?.token ?? null;
    expect(token, `${portal} sign-in answers a token`).to.be.a('string');
    return String(token);
  });
}

/**
 * Send one operation as this console with the account's own token and see the
 * server refuse it with `message` (requireRole's "Access Denied" by default),
 * returning no data for `field`.
 */
export function expectApiRefused(
  portal: ConsoleKey,
  account: RunAccount,
  query: string,
  variables: Record<string, unknown>,
  field: string,
  message: string = ACCESS_DENIED,
): void {
  consoleToken(portal, account).then((token) =>
    gqlRaw(portal, query, variables, token).then((body) => expectRefused(body, field, message)),
  );
}

/** Send one read as this console and yield its data, which must carry no error. */
export function apiRead<T>(
  portal: ConsoleKey,
  account: RunAccount,
  query: string,
  variables: Record<string, unknown> = {},
): Cypress.Chainable<T> {
  return consoleToken(portal, account).then((token) =>
    gqlRaw<T>(portal, query, variables, token).then((body) => {
      expect(body.errors, 'the read answers without an error').to.be.undefined;
      return cy.wrap(body.data as T, { log: false });
    }),
  );
}

/** Money compared to the paisa. */
export const samePaisa = (a: number, b: number): boolean => Math.abs(a - b) < 0.011;

// ------------------------------------------------------------- Finance shops

/** The two shops Finance keeps apart (payment.source.ts): the pod shop and the pet store. */
export type PaymentShop = 'POD_SHOP' | 'ECOMM';

/** One shop's payments, as the shop Payment Logs page asks for them. */
export const SHOP_PAYMENTS_LOOKUP = `query E2eShopPayments($shop: PaymentShop!, $query: TableQueryInput) {
  shopPaymentsTable(shop: $shop, query: $query) { total rows { id target_type } }
}`;

export interface ShopPaymentRow {
  id: string;
  target_type: string | null;
}

export interface OrderRefundRow {
  id: string;
  cash_amount: number;
  coins: number;
  refund_value: number;
}

export interface OrderRefundsPage {
  shopOrderRefundsTable: {
    total: number;
    rows: OrderRefundRow[];
    summary: { count: number; cash_total: number };
  };
}

/** Every refund row is worth its cash plus its coins (`refund_value` in payment.orderRefund.service.ts). */
export function expectRefundValuesAddUp(page: OrderRefundsPage['shopOrderRefundsTable']): void {
  expect(page.summary.count, 'the totals strip counts every refund the filter matches').to.equal(page.total);
  for (const row of page.rows) {
    expect(samePaisa(row.refund_value, row.cash_amount + row.coins), `refund ${row.id} = cash + coins`).to.be.true;
  }
  cy.byTestId('finance-order-refunds-totals').should('contain.text', String(page.summary.count));
}

/**
 * The run account holding ONLY this console's role — for consoles whose reads
 * the three portal roles would also open (Legal's acceptance log and the Pods
 * audit trail are mounted in Logs), so a pass proves the console's own role.
 * `releaseConsoleRole` hands the three back.
 */
export function soleConsoleAccount(portal: ConsoleKey): RunAccount {
  const account = consoleAccount(portal);
  revokeRoles(account, ['SUPPORT_MANAGER', 'LEGAL_MANAGER', 'ALL_PODS_ACCESS']);
  return account;
}

// ---------------------------------------------------------------- CRM leads

export type LeadKind = 'venue' | 'host' | 'ecomm';

interface LeadKindSpec {
  /** List path; `/new` and `/:id/view` hang off it. */
  path: string;
  tableId: string;
  tableOperation: string;
  detailOperation: string;
  createOperation: string;
  deleteOperation: string;
  /** What the lead is called by (the table's name column and the detail heading). */
  nameField: 'venue_name' | 'host_name' | 'seller_name';
  /** `assertUniqueLeadPhone`'s kind label in server crm.service.ts. */
  label: string;
  /** The detail page's QueryGuard line for an id no lead carries. */
  notFound: string;
  create: string;
  remove: string;
  lookup: string;
  lookupField: string;
}

export const LEAD_KINDS: Readonly<Record<LeadKind, LeadKindSpec>> = {
  venue: {
    path: '/venue-leads',
    tableId: 'crm-venue-leads',
    tableOperation: 'VenueLeadsTable',
    detailOperation: 'VenueLead',
    createOperation: 'CreateVenueLead',
    deleteOperation: 'DeleteVenueLead',
    nameField: 'venue_name',
    label: 'venue lead',
    notFound: 'Venue lead not found.',
    create: `mutation E2eCreateVenueLead($input: VenueLeadInput!) { createVenueLead(input: $input) { id venue_name } }`,
    remove: `mutation E2eDeleteVenueLead($id: ID!) { deleteVenueLead(id: $id) }`,
    lookup: `query E2eVenueLeads($query: TableQueryInput) { venueLeadsTable(query: $query) { rows { id venue_name } } }`,
    lookupField: 'venueLeadsTable',
  },
  host: {
    path: '/host-leads',
    tableId: 'crm-host-leads',
    tableOperation: 'HostLeadsTable',
    detailOperation: 'HostLead',
    createOperation: 'CreateHostLead',
    deleteOperation: 'DeleteHostLead',
    nameField: 'host_name',
    label: 'host lead',
    notFound: 'Host lead not found.',
    create: `mutation E2eCreateHostLead($input: HostLeadInput!) { createHostLead(input: $input) { id host_name } }`,
    remove: `mutation E2eDeleteHostLead($id: ID!) { deleteHostLead(id: $id) }`,
    lookup: `query E2eHostLeads($query: TableQueryInput) { hostLeadsTable(query: $query) { rows { id host_name } } }`,
    lookupField: 'hostLeadsTable',
  },
  ecomm: {
    path: '/ecomm-leads',
    tableId: 'crm-ecomm-leads',
    tableOperation: 'EcommLeadsTable',
    detailOperation: 'EcommLead',
    createOperation: 'CreateEcommLead',
    deleteOperation: 'DeleteEcommLead',
    nameField: 'seller_name',
    label: 'ecomm lead',
    notFound: 'Ecomm lead not found.',
    create: `mutation E2eCreateEcommLead($input: EcommLeadInput!) { createEcommLead(input: $input) { id seller_name } }`,
    remove: `mutation E2eDeleteEcommLead($id: ID!) { deleteEcommLead(id: $id) }`,
    lookup: `query E2eEcommLeads($query: TableQueryInput) { ecommLeadsTable(query: $query) { rows { id seller_name } } }`,
    lookupField: 'ecommLeadsTable',
  },
};

/** The duplicate-phone refusal (`assertUniqueLeadPhone`, server crm.service.ts). */
export const duplicatePhoneMessage = (kind: LeadKind): string =>
  `A ${LEAD_KINDS[kind].label} with this phone number already exists. Each lead must have a unique phone number.`;

/**
 * A phone number no person holds: five leading zeros, then five digits taken
 * from the run's stamp and a per-spec salt — unique per run and per lead, never
 * a real subscriber, and nothing in the CRM dials or messages on create.
 */
export function fakeLeadPhone(stamp: string, salt: number): string {
  const digits = stamp.replaceAll(/\D/g, '');
  const tail = String((Number(digits.slice(-5) || '0') + salt * 7919) % 100000).padStart(5, '0');
  return `00000${tail}`;
}

/** File a lead as the CRM seat: a marker name, a fake phone, no email, nothing sent anywhere. */
export function createLead(kind: LeadKind, name: string, phone: string): Cypress.Chainable<{ id: string }> {
  const contacts = [{ name: 'E2E contact', mobile_number: phone }];
  const base = { [LEAD_KINDS[kind].nameField]: name, contacts };
  const input = kind === 'venue' ? { ...base, city: 'E2E City', full_address: `${name} address` } : base;
  return cy.gql<Record<string, { id: string }>>(LEAD_KINDS[kind].create, { input }).then((data) => {
    const created = Object.values(data)[0];
    return cy.wrap({ id: created.id }, { log: false });
  });
}

/** Remove every lead of this kind whose name carries the marker. */
export function deleteMarkedLeads(kind: LeadKind, marker: string): void {
  const spec = LEAD_KINDS[kind];
  cy.gql<Record<string, { rows: Record<string, string>[] }>>(spec.lookup, {
    query: { search: marker, page: 1, page_size: 50 },
  }).then((data) => {
    for (const row of data[spec.lookupField].rows.filter((r) => String(r[spec.nameField]).includes(marker))) {
      cy.gql(spec.remove, { id: row.id });
    }
  });
}

/** What each lead form's Zod schema says first when it is submitted empty (forms/<kind>-lead/*.schema.ts). */
const EMPTY_FORM_ERRORS: Readonly<Record<LeadKind, readonly string[]>> = {
  venue: ['Super category is required', 'Venue name is required'],
  host: ['Super category is required', 'Host name is required'],
  ecomm: ['Super category is required', 'Seller name is required'],
};

/**
 * The scenarios every CRM lead module shares — the venue, host and ecomm lead
 * triplet is one table (CrmLeadsTable), one form shape and one server guard.
 * `prefix` is the spec's id stem; `ctx` hands over the account and marker the
 * spec's `before()` set up.
 */
export function leadScenarios(kind: LeadKind, prefix: string, ctx: () => { account: RunAccount; marker: string }): void {
  const spec = LEAD_KINDS[kind];

  it(`${prefix}-01 the new ${spec.label} form lists its validation errors on an empty submit, sends nothing, and Cancel returns to the list`, () => {
    const creates = countOperation(spec.createOperation);
    cy.visitPortal('crm', `${spec.path}/new`);
    cy.byTestId('lead-form-submit').click();
    for (const message of EMPTY_FORM_ERRORS[kind]) cy.byTestId('lead-form-errors').should('contain.text', message);
    expectNotSent(creates, spec.createOperation);
    cy.byTestId('lead-form-cancel').click();
    cy.location('pathname').should('eq', spec.path);
    expectNotSent(creates, spec.createOperation);
  });

  it(`${prefix}-02 a ${spec.label} the spec filed is found by its name and opens its detail page`, () => {
    const { account, marker } = ctx();
    const name = `${marker} ${kind} lead`;
    const phone = fakeLeadPhone(account.stamp, 2);
    createLead(kind, name, phone).then(({ id }) => {
      cy.interceptOperation(spec.tableOperation);
      cy.visitPortal('crm', spec.path);
      cy.wait(`@${spec.tableOperation}`);
      cy.byTestId('table-toolbar-search').should('be.enabled').type(marker, { delay: 0 });
      cy.wait(`@${spec.tableOperation}`);
      cy.byTestId(`${spec.tableId}-row-${id}`).first().should('contain.text', name).and('contain.text', phone).click(24, 16);
      cy.location('pathname').should('eq', `${spec.path}/${id}/view`);
      cy.byTestId('lead-detail-name').should('have.text', name);
    });
  });

  it(`${prefix}-03 an id no ${spec.label} carries reads "${spec.notFound}"`, () => {
    cy.visitPortal('crm', `${spec.path}/${ZERO_ID}/view`);
    cy.byTestId('query-guard-not-found').should('contain.text', spec.notFound);
  });

  it(`${prefix}-04 a second ${spec.label} with the same phone is refused by the server`, () => {
    const { account, marker } = ctx();
    const phone = fakeLeadPhone(account.stamp, 4);
    createLead(kind, `${marker} ${kind} first`, phone);
    cy.apiPortalLogin('crm', account.email, account.password('CHANGED')).then((token) => {
      const spec4 = LEAD_KINDS[kind];
      const base = { [spec4.nameField]: `${marker} ${kind} twin`, contacts: [{ name: 'E2E twin', mobile_number: `+91 ${phone}` }] };
      const input = kind === 'venue' ? { ...base, city: 'E2E City', full_address: 'E2E twin address' } : base;
      const field = spec4.create.match(/\{\s*(\w+)\(/)?.[1] ?? '';
      gqlRaw('crm', spec4.create, { input }, token).then((body) => expectRefused(body, field, duplicatePhoneMessage(kind)));
    });
  });

  it(`${prefix}-05 deleting a filed ${spec.label} from its row asks first, then removes it`, () => {
    const { account, marker } = ctx();
    const name = `${marker} ${kind} to delete`;
    createLead(kind, name, fakeLeadPhone(account.stamp, 5)).then(({ id }) => {
      cy.viewport(2560, 1200);
      cy.interceptOperation(spec.tableOperation);
      cy.visitPortal('crm', spec.path);
      cy.wait(`@${spec.tableOperation}`);
      cy.byTestId('table-toolbar-search').should('be.enabled').type(name, { delay: 0 });
      cy.wait(`@${spec.tableOperation}`);
      cy.byTestId(`${spec.tableId}-row-${id}`).find('[data-testid="row-action-delete"]').click();
      cy.byTestId('confirm-dialog').should('be.visible');
      cy.byTestId('confirm-dialog-message').should('have.text', `Delete "${name}"? This cannot be undone.`);
      cy.interceptOperation(spec.deleteOperation);
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait(`@${spec.deleteOperation}`).its('response.body.data').should('deep.equal', {
        [`delete${kind[0].toUpperCase()}${kind.slice(1)}Lead`]: true,
      });
      cy.byTestId(`${spec.tableId}-row-${id}`).should('not.exist');
    });
  });
}
