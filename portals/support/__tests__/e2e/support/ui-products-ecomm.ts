import { E2E_GRANT_ROLES_MUTATION } from '@duncit/utils';
import { LOGIN_MUTATION } from './operations';
import { portalTokenKey, portalUrl, type StaffPortal } from './portals';
import type { RunAccount } from './run-account';
import { ACCESS_DENIED, deniedBanner, expectRefused, gqlRaw } from './ui-staff';

/**
 * Shared steps for the Products and E-commerce (pet store) access specs.
 *
 * Neither console can be opened by the run account: Products admits only
 * PRODUCTS_MANAGER and the E-commerce console only ECOMM_STORE_MANAGER
 * (SUPER_ADMIN passes both) — server PORTAL_ROLE_REQUIREMENTS and each
 * console's appConfig.requiredRoles agree, and none of those roles is grantable
 * to a run account. So these specs prove the refusals only: the sign-in, the
 * shell's role gate on a session that lacks the role, and the server's
 * requireRole on what each console reads.
 *
 * The two products stay apart here as everywhere: Products (and its Partner
 * Brand review) reads the brand/inventory resolvers; the E-commerce console
 * reads only the pet store's `store*` resolvers.
 */

/** `appConfig.fullName` of each console — what the denied banner names. */
export const PRODUCTS_FULL_NAME = 'Duncit Products';
export const ECOMM_PORTAL_FULL_NAME = 'Duncit E-commerce';

/** One console read: the field and a query selecting only `__typename` on it. */
export interface ConsoleRead {
  field: string;
  query: string;
  variables?: Record<string, unknown>;
}

const read = (field: string, args = '', variables?: Record<string, unknown>, decl = ''): ConsoleRead => ({
  field,
  query: `query E2eRefused_${field}${decl} { ${field}${args} { __typename } }`,
  variables,
});

/**
 * What the Products console loads on its pages, each behind requireRole on the
 * server (inventory.roles ADMIN_RW, productOrder OPS_RW/CANCEL_RW, ecommBrand
 * BRAND_REVIEW, approval ECOMM_PORTAL/WAREHOUSE_REVIEW, catalogDeletion
 * PRODUCTS_TEAM). None admits SUPPORT_MANAGER, LEGAL_MANAGER, ALL_PODS_ACCESS
 * or ECOMM_MANAGER.
 */
export const PRODUCTS_CONSOLE_READS: readonly ConsoleRead[] = [
  read('inventoryProductsTable'),
  read('productOrdersTable'),
  read('ecommBrandsTable'),
  read('productListingRequestsTable'),
  read('warehouseApprovalRequests'),
  read('myEcommChangeRequests'),
  read('catalogDeletionRequestsTable', '(kind: $kind)', { kind: 'PRODUCT' }, '($kind: CatalogDeletionKind!)'),
  read('deletionRefundsTable'),
];

/**
 * What the E-commerce console loads, every one wrapped in requireStoreAdmin
 * (server/src/modules/commerce/store/store.admin.resolver.ts) =
 * SUPER_ADMIN or ECOMM_STORE_MANAGER — never the Partner Brand ECOMM_MANAGER.
 */
export const STORE_CONSOLE_READS: readonly ConsoleRead[] = [
  read('storeDashboard'),
  read('storeOrdersTable'),
  read('storeReturnsTable'),
  read('storeCustomersTable'),
  read('storeAdminProductsTable'),
  read('storeCouponsTable'),
  read('storePaymentsTable'),
  read('storeAdminSettings'),
];

/** Every read must answer "Access Denied" with no data for this token. */
export function expectReadsRefused(portal: StaffPortal, reads: readonly ConsoleRead[], token: string): void {
  for (const { field, query, variables } of reads) {
    gqlRaw(portal, query, variables ?? {}, token).then((body) => expectRefused(body, field, ACCESS_DENIED));
  }
}

/** A real session token from a portal the account can open — `portal_key` decides which. */
export function tokenFrom(portalKey: string, account: RunAccount): Cypress.Chainable<string> {
  // The header only names the caller for the rate limiter; the gate reads portal_key.
  return gqlRaw<{ login: { token: string } | null }>(
    'support',
    LOGIN_MUTATION,
    { input: { email: account.email, password: account.password('CHANGED'), portal_key: portalKey } },
    null,
  ).then((body) => {
    expect(body.errors, `the ${portalKey} sign-in answers without an error`).to.be.undefined;
    const token = body.data?.login?.token;
    expect(token, `the ${portalKey} sign-in yields a token`).to.be.a('string').and.not.be.empty;
    return String(token);
  });
}

const ACTIVE_CITIES = `query E2eActiveCities { locations(filter: { is_active: true }) { city } }`;

/**
 * CITY_ADMIN for the run account, scoped to a real active city read from the
 * server (a CITY_ADMIN without one is refused every scoped read).
 */
export function grantCityAdmin(account: RunAccount): void {
  cy.gql<{ locations: { city: string }[] }>(ACTIVE_CITIES, {}, { token: null }).then((data) => {
    const city = data.locations.map((l) => l.city.trim()).find(Boolean);
    if (!city) throw new Error('Staging has no active location: CITY_ADMIN needs a real assigned_city.');
    cy.staffGql<{ grantE2eRunAccountRoles: string[] }>(E2E_GRANT_ROLES_MUTATION, {
      input: { stamp: account.stamp, email: account.email, roles: ['CITY_ADMIN'], assigned_city: city },
    })
      .its('grantE2eRunAccountRoles')
      .should('include', 'CITY_ADMIN');
  });
}

/** Signed out, a deep link lands on /login carrying the path to return to. */
export function expectSignedOutRedirect(portal: StaffPortal, path: string): void {
  cy.clearAuth();
  cy.visitPortal(portal, path);
  cy.location('pathname').should('eq', '/login');
  cy.location('search').should('eq', `?redirect=${encodeURIComponent(path)}`);
  cy.byTestId('login-screen').should('be.visible');
  cy.window().its('localStorage').invoke('getItem', portalTokenKey(portal)).should('equal', null);
}

/**
 * A session that lacks the console's role — a real token signed for another
 * portal, stored where this console reads its own — is turned away by the
 * shell once `SessionMe` answers: the token is cleared and the login page
 * shows the denied banner.
 */
export function expectSessionDenied(portal: StaffPortal, path: string, token: string, fullName: string): void {
  const tokenKey = portalTokenKey(portal);
  cy.interceptOperation('SessionMe');
  cy.visit(portalUrl(portal, path), {
    onBeforeLoad(win) {
      win.localStorage.setItem(tokenKey, token);
    },
  });
  cy.wait('@SessionMe').its('response.body.data.me.roles').should('be.an', 'array');
  cy.location('pathname').should('eq', '/login');
  cy.location('search').should('eq', '?denied=1');
  cy.byTestId('login-error').should('have.text', deniedBanner(fullName));
  cy.window().its('localStorage').invoke('getItem', tokenKey).should('equal', null);
}
