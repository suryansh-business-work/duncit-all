import { E2E_GRANT_ROLES_MUTATION, type E2eStaffRole } from '@duncit/utils';
import { LOGIN_MUTATION } from './operations';
import type { RunAccount } from './run-account';
import { gqlRaw, restoreStaffRoles, revokeRoles, staffAccount } from './ui-staff';

/**
 * Shared steps for the Admin console specs (specs/admin/, first half of the
 * scenario map).
 *
 * admin.duncit.com admits SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER and
 * FINANCE_USER (portals/admin/src/config/app-config.ts and the server's
 * PORTAL_ROLE_REQUIREMENTS.admin agree). SUPER_ADMIN is never grantable, so
 * every spec signs in as one of the limited roles:
 *
 * - CITY_ADMIN, granted with an `assigned_city` — the run account's own city
 *   when it has one, otherwise a real active city. A city admin with no city is
 *   refused every scoped read (rbac.ts `readScope`), and one whose city differs
 *   from the run account's would be refused the run account's own record.
 * - SUPPORT_USER, which is not held to a place: the directory tables list every
 *   member, so the specs that search the whole user list use it.
 * - ZONAL_ADMIN is only used at the sign-in gate: the e2e grant cannot assign
 *   zones, and a zonal admin without zones is refused every scoped read.
 *
 * The record the specs read and write is the run account itself — it is purged
 * with the account at the end of the run. Nothing else is edited.
 */

export const ADMIN_FULL_NAME = 'Duncit Admin';

/** The run account as the admin console sees it. */
export interface RunProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  phone_extension: string | null;
  city: string | null;
}

const ME = `query E2eAdminRunProfile {
  me { user_id full_name email phone_number phone_extension city }
}`;

const ACTIVE_CITIES = `query E2eAdminActiveCities { locations(filter: { is_active: true }) { city } }`;

/** A real session token from a portal the account can open. */
export function tokenFor(portalKey: string, account: RunAccount): Cypress.Chainable<string> {
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

/** The run account's own profile, read with the Support session staffAccount() made possible. */
export function runProfile(account: RunAccount): Cypress.Chainable<RunProfile> {
  return tokenFor('support', account).then((token) =>
    cy.gql<{ me: RunProfile }>(ME, {}, { token }).then(({ me }) => {
      expect(me.user_id, 'the run account has an id').to.be.a('string').and.not.be.empty;
      return me;
    }),
  );
}

/** The city a CITY_ADMIN run account administers: its own, or a real active one. */
function adminCity(profile: RunProfile): Cypress.Chainable<string> {
  const own = (profile.city ?? '').trim();
  if (own) return cy.wrap(own, { log: false });
  return cy.gql<{ locations: { city: string }[] }>(ACTIVE_CITIES, {}, { token: null }).then((data) => {
    const city = data.locations.map((l) => l.city.trim()).find(Boolean);
    if (!city) throw new Error('Staging has no active location: CITY_ADMIN needs a real assigned_city.');
    return city;
  });
}

/** Give the run account admin roles; CITY_ADMIN travels with its city. */
export function grantAdminRoles(
  account: RunAccount,
  profile: RunProfile,
  roles: readonly E2eStaffRole[],
): Cypress.Chainable<string> {
  return adminCity(profile).then((city) =>
    cy
      .staffGql<{ grantE2eRunAccountRoles: string[] }>(E2E_GRANT_ROLES_MUTATION, {
        input: {
          stamp: account.stamp,
          email: account.email,
          roles: [...roles],
          ...(roles.includes('CITY_ADMIN') ? { assigned_city: city } : {}),
        },
      })
      .then(({ grantE2eRunAccountRoles }) => {
        expect(grantE2eRunAccountRoles).to.include.members([...roles]);
        return city;
      }),
  );
}

/** Every admin role a spec of this group may grant — all of them are taken back afterwards. */
export const ADMIN_ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'];

/** What one admin spec holds for its run: the account, its own profile, and the city it administers. */
export interface AdminRun {
  account: RunAccount;
  profile: RunProfile;
  city: string;
}

/**
 * The run account holding exactly `roles` of the admin roles (plus the three
 * staff roles every spec keeps), with its profile read. Yields the AdminRun.
 */
export function adminRun(roles: readonly E2eStaffRole[]): Cypress.Chainable<AdminRun> {
  const account = staffAccount();
  return runProfile(account).then((profile) => {
    const others = ADMIN_ROLES.filter((role) => !roles.includes(role));
    if (others.length > 0) revokeRoles(account, others);
    if (roles.length === 0) return cy.wrap({ account, profile, city: '' }, { log: false });
    return grantAdminRoles(account, profile, roles).then((city) => ({ account, profile, city }));
  });
}

/** Swap the admin roles mid-spec: take `drop` away, give `add`. */
export function switchAdminRoles(run: AdminRun, drop: readonly E2eStaffRole[], add: readonly E2eStaffRole[]): void {
  if (drop.length > 0) revokeRoles(run.account, drop);
  if (add.length > 0) grantAdminRoles(run.account, run.profile, add);
}

/** Hand the account back with no admin role (revoking CITY_ADMIN also clears its city). */
export function releaseAdmin(run: AdminRun | undefined): void {
  if (run) restoreStaffRoles(run.account, ADMIN_ROLES);
}

/** A real password sign-in to the Admin console; the next `visitPortal('admin', …)` carries it. */
export function signInAdmin(run: AdminRun): Cypress.Chainable<string> {
  return cy.apiPortalLogin('admin', run.account.email, run.account.password('CHANGED'));
}

/** The details page of the run account, on a tab (`?selectedtab=` is how DuncitTabs keeps it). */
export const userPage = (run: AdminRun, tab?: string): string =>
  `/users/${run.profile.user_id}${tab ? `?selectedtab=${tab}` : ''}`;

/** Open the run account's details page and wait for its record. */
export function openRunUser(run: AdminRun, tab?: string): void {
  cy.interceptOperation('AdminUser');
  cy.visitPortal('admin', userPage(run, tab));
  cy.wait('@AdminUser').its('response.body.errors').should('be.undefined');
  cy.byTestId('back-header-title').should('be.visible');
}

/** A string of `n` characters — for "must be N characters or fewer". */
export const longText = (n: number): string => 'x'.repeat(n);

/** A TextField (by its test id) showing `message` under it, its input marked invalid. */
export function expectFieldError(testId: string, message: string): void {
  cy.byTestId(testId).should('contain.text', message);
  cy.byTestId(testId).find('input, textarea').first().should('have.attr', 'aria-invalid', 'true');
}

/** The input inside a TextField found by its test id. */
export const fieldInput = (testId: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.byTestId(testId).find('input, textarea').first();
