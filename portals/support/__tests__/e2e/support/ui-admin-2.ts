import { E2E_GRANT_ROLES_MUTATION, type E2eStaffRole } from '@duncit/utils';
import { openLogin } from './login-page';
import { portalTokenKey } from './portals';
import type { RunAccount } from './run-account';
import { PORTAL_REFUSED, gqlRaw, revokeRoles, restoreStaffRoles, staffAccount, type GqlBody } from './ui-staff';

/**
 * Shared steps for the second half of the Admin console UI specs
 * (specs/admin — Categories through City scope).
 *
 * The Admin console (portals/admin) admits SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN,
 * SUPPORT_USER and FINANCE_USER (`appConfig.requiredRoles`, and the server's
 * PORTAL_ROLE_REQUIREMENTS.admin). SUPER_ADMIN is never granted to a run
 * account, so these specs work as a City Admin: the e2e testing API grants
 * CITY_ADMIN together with `assigned_city`, because a City Admin without a city
 * is refused every scoped read (`readScope` in server/src/middleware/rbac.ts
 * fails closed). Every `after()` hands the account back with
 * `releaseAdminRoles`, which revokes the extra roles (and with CITY_ADMIN, the
 * city) and grants the three portal roles again.
 *
 * Platform settings (Branding, Upload Settings, Settings, Portal App Settings)
 * are written by SUPER_ADMIN and TECH_MANAGER only. Those specs never save a
 * changed value: they prove the City Admin's save is REFUSED, sending the page's
 * own unchanged values wherever the page allows it.
 */

export interface AdminSeat {
  account: RunAccount;
  /** The city the run account administers as CITY_ADMIN. */
  city: string;
  /** The run account's own user id. */
  userId: string;
}

/** The run account as the Admin console reads it. */
export const ADMIN_ME = `query E2eAdminMe { me { user_id city } }`;

const LOCATION_LOOKUP = `query E2eAdminLocations($filter: LocationFilterInput) {
  locations(filter: $filter) {
    id city location_name location_pincode is_active is_launched launch_target whatsapp_group_url
    location_zones { zone_name pincode }
    launch_media { hero_video_url hero_image_url }
  }
}`;

export interface LocationRecord {
  id: string;
  city: string;
  location_name: string;
  location_pincode: string;
  is_active: boolean;
  is_launched: boolean;
  launch_target: number;
  whatsapp_group_url: string;
  location_zones: { zone_name: string; pincode: string | null }[];
  launch_media: { hero_video_url: string; hero_image_url: string };
}

/** `shell.login.accessDenied` with the Admin console's `appConfig.fullName`. */
export const ADMIN_DENIED_BANNER = 'You do not have access to Duncit Admin. Please contact your administrator.';

/** The city a City Admin is given: the run account's own, else the first city staging serves. */
function pickCity(own: string | null): Cypress.Chainable<string> {
  if (own?.trim()) return cy.wrap(own.trim(), { log: false });
  return cy.gql<{ locations: LocationRecord[] }>(LOCATION_LOOKUP, {}).then((data) => {
    const city = data.locations.map((l) => (l.city || l.location_name).trim()).find(Boolean);
    if (!city) throw new Error('Staging serves no location, so there is no city to give the City Admin.');
    return city;
  });
}

/** Give the run account CITY_ADMIN for `city`. */
export function grantCityAdmin(account: RunAccount, city: string): void {
  cy.staffGql<{ grantE2eRunAccountRoles: string[] }>(E2E_GRANT_ROLES_MUTATION, {
    input: { stamp: account.stamp, email: account.email, roles: ['CITY_ADMIN'], assigned_city: city },
  })
    .its('grantE2eRunAccountRoles')
    .should('include', 'CITY_ADMIN');
}

/** Take CITY_ADMIN away; the e2e API clears `assigned_city` with it. */
export function revokeCityAdmin(account: RunAccount): void {
  revokeRoles(account, ['CITY_ADMIN']);
}

/** Sign in to the Admin console through the API; the next `visitPortal('admin', …)` is signed in. */
export const signInAdmin = (account: RunAccount): Cypress.Chainable<string> =>
  cy.apiPortalLogin('admin', account.email, account.password('CHANGED'));

/**
 * The run account as a City Admin of a real city, signed in to the Admin
 * console: every Admin spec's first step.
 */
export function cityAdminSeat(): Cypress.Chainable<AdminSeat> {
  const account = staffAccount();
  return cy
    .apiPortalLogin('support', account.email, account.password('CHANGED'))
    .then(() => cy.gql<{ me: { user_id: string; city: string | null } }>(ADMIN_ME))
    .then(({ me }) =>
      pickCity(me.city).then((city) => {
        grantCityAdmin(account, city);
        return signInAdmin(account).then(() => ({ account, city, userId: me.user_id }));
      }),
    );
}

/** Hand the account back: the admin roles gone, the three portal roles held. */
export function releaseAdminRoles(
  account: RunAccount | undefined,
  roles: readonly E2eStaffRole[] = ['CITY_ADMIN'],
): void {
  if (account) restoreStaffRoles(account, roles);
}

/** Swap one admin role for another and sign in again (a role travels in the token). */
export function swapAdminRole(account: RunAccount, from: E2eStaffRole, to: E2eStaffRole): Cypress.Chainable<string> {
  revokeRoles(account, [from]);
  cy.staffGql(E2E_GRANT_ROLES_MUTATION, { input: { stamp: account.stamp, email: account.email, roles: [to] } });
  return signInAdmin(account);
}

/** The Admin sign-in screen (it posts `AdminLogin`, not `ConsoleLogin`) refusing the account. */
export function expectAdminUiLoginRefused(account: RunAccount): void {
  openLogin('admin');
  cy.byTestId('field-email').clear().type(account.email);
  cy.byTestId('field-password').clear().type(account.password('CHANGED'), { log: false });
  cy.interceptOperation('AdminLogin');
  cy.byTestId('login-submit').click();
  cy.wait('@AdminLogin').its('response.body.errors.0.message').should('eq', PORTAL_REFUSED);
  cy.byTestId('login-error').should('contain.text', PORTAL_REFUSED);
  cy.location('pathname').should('eq', '/login');
  cy.window().its('localStorage').invoke('getItem', portalTokenKey('admin')).should('equal', null);
}

/** POST as the Admin console with the kept session, errors included (for refusals and tolerant cleanup). */
export function adminRaw<T = Record<string, unknown>>(
  query: string,
  variables: Record<string, unknown> = {},
): Cypress.Chainable<GqlBody<T>> {
  return gqlRaw<T>('admin', query, variables, (Cypress.env('__liveToken') as string | null) ?? null);
}

/** The first error a refused write answered with. */
export function expectError(body: GqlBody, message: string): void {
  expect(body.errors?.[0]?.message, 'the server refuses it').to.equal(message);
}

/** A MUI Snackbar `message` toast (the Admin pages' own, not `notify()`). */
export function expectToast(testId: string, text: string): void {
  cy.byTestId(testId).should('contain.text', text);
}

const TYPABLE = 'input:not([type="hidden"]):not([type="color"]), textarea:not([aria-hidden="true"])';

/**
 * The typable input behind a test id: the element itself when the id sits on
 * the input (`slotProps.htmlInput`), else the first one inside the TextField /
 * Autocomplete root that carries it.
 */
export const fieldInput = (testId: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.byTestId(testId).then(($el) => ($el.is(TYPABLE) ? $el : $el.find(TYPABLE).first()));

/** Clear a field and type into it at once. */
export function typeInto(testId: string, text: string): void {
  fieldInput(testId).clear().type(text, { delay: 0 });
}

// ------------------------------------------------------------ Locations

/** Every location whose city carries `marker`. */
export function markedLocations(marker: string): Cypress.Chainable<LocationRecord[]> {
  return cy
    .gql<{ locations: LocationRecord[] }>(LOCATION_LOOKUP, { filter: { search: marker } })
    .then((data) => data.locations.filter((l) => l.city.includes(marker) || l.location_name.includes(marker)));
}

/** The one location named `city`, which the spec must have created. */
export function locationNamed(city: string): Cypress.Chainable<LocationRecord> {
  return markedLocations(city).then((rows) => {
    const row = rows.find((l) => l.city === city);
    if (!row) throw new Error(`The location "${city}" this spec created was not found.`);
    return row;
  });
}

const DELETE_LOCATION = `mutation E2eDeleteLocation($id: ID!) { deleteLocation(location_doc_id: $id) }`;

/** Remove every location carrying the marker (tolerant: a scenario may have removed it already). */
export function deleteMarkedLocations(marker: string): void {
  markedLocations(marker).then((rows) => {
    for (const row of rows) adminRaw(DELETE_LOCATION, { id: row.id });
  });
}

const CREATE_LOCATION = `mutation E2eCreateLocation($input: CreateLocationInput!) {
  createLocation(input: $input) { id city is_launched }
}`;

/** An image every app can load: the platform's own logo from Branding. */
export function brandingImage(): Cypress.Chainable<string> {
  return cy.gql<{ branding: { logo_url: string | null } }>(`query E2eBrandingLogo { branding { logo_url } }`).then((data) => {
    const url = data.branding.logo_url?.trim();
    if (!url) throw new Error('Branding has no logo_url on staging, so there is no image to give a test record.');
    return url;
  });
}

/** A not-launched city the spec owns, filed through the API (for specs that are not about the dialog). */
export function createMarkedCity(city: string): Cypress.Chainable<{ id: string; city: string }> {
  return brandingImage().then((image) =>
    cy
      .gql<{ createLocation: { id: string; city: string } }>(CREATE_LOCATION, {
        input: {
          location_name: city,
          country: 'India',
          country_code: 'IN',
          state: 'Karnataka',
          state_code: 'KA',
          city,
          location_image: image,
          location_pincode: '560001',
          location_zones: [{ zone_name: 'E2E Area', pincode: '560001' }],
          is_launched: false,
        },
      })
      .then((data) => data.createLocation),
  );
}

/**
 * Fill the New Location dialog: state picked from the list, the city typed
 * (a new city is free text), one area per entry, and the image URL.
 */
export function fillLocationDialog(city: string, image: string, areas: readonly [string, string][]): void {
  fieldInput('location-form-state').type('Karnataka', { delay: 0 }).type('{downArrow}{enter}');
  fieldInput('location-form-state').should('have.value', 'Karnataka');
  typeInto('location-form-city', city);
  areas.forEach(([name, pin], index) => {
    if (index > 0) cy.byTestId('location-form-add-zone').click();
    cy.byTestId('location-form-zone-name').eq(index).find('input').type(name, { delay: 0 });
    cy.byTestId('location-form-zone-pin').eq(index).find('input').type(pin, { delay: 0 });
  });
  typeInto('location-form-image', image);
}

// ------------------------------------------------------------ Approvals / portal access

/** A PORTAL_ACCESS row of the approval inbox, as these specs read it. */
export interface AccessRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  target_id: string | null;
  subject_name: string | null;
  subject_email: string | null;
  review_notes: string | null;
  reviewed_by_name: string | null;
}

const REQUEST_ACCESS = `mutation E2eRequestPortalAccess($key: String!) {
  requestPortalAccess(portal_key: $key) { key request_status }
}`;

const ACCESS_REQUESTS = `query E2eAccessRequests($query: TableQueryInput) {
  approvalRequestsTable(query: $query) {
    rows { id status target_id subject_name subject_email review_notes reviewed_by_name }
  }
}`;

/** The run account's own requests for `portal`, newest first. */
export function myAccessRequests(account: RunAccount, portal: string): Cypress.Chainable<AccessRequest[]> {
  return cy
    .gql<{ approvalRequestsTable: { rows: AccessRequest[] } }>(ACCESS_REQUESTS, {
      query: {
        page: 1,
        page_size: 50,
        sort_by: 'created_at',
        sort_dir: 'desc',
        filters: [{ field: 'type', op: 'eq', value: 'PORTAL_ACCESS' }],
        search: account.email,
      },
    })
    .then((data) =>
      data.approvalRequestsTable.rows.filter(
        (r) => r.target_id === portal && r.subject_email?.toLowerCase() === account.email.toLowerCase(),
      ),
    );
}

/**
 * The run account asks for a console it cannot open (a Jump to Portal
 * request) and yields that pending request. A console no run account is ever
 * given, so the request can only ever be denied by these specs.
 */
export function fileAccessRequest(account: RunAccount, portal: string): Cypress.Chainable<AccessRequest> {
  cy.gql(REQUEST_ACCESS, { key: portal }).its('requestPortalAccess.request_status').should('eq', 'PENDING');
  return myAccessRequests(account, portal).then((rows) => {
    const pending = rows.find((r) => r.status === 'PENDING');
    if (!pending) throw new Error(`The ${portal} access request the run account filed is not in the inbox.`);
    return pending;
  });
}

const DENY_REQUEST = `mutation E2eDenyRequest($id: ID!, $notes: String) { denyRequest(id: $id, notes: $notes) { id status } }`;

/** Deny a request through the API — "reviewed elsewhere" for the page that has it open. */
export const denyRequestApi = (id: string, notes: string) => cy.gql(DENY_REQUEST, { id, notes });

/** Leave none of the run account's requests for `portals` pending (tolerant). */
export function denyPendingRequests(account: RunAccount, portals: readonly string[]): void {
  for (const portal of portals) {
    myAccessRequests(account, portal).then((rows) => {
      for (const row of rows.filter((r) => r.status === 'PENDING')) {
        adminRaw(DENY_REQUEST, { id: row.id, notes: 'Closed by the staff portals suite.' });
      }
    });
  }
}
