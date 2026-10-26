/// <reference types="cypress" />
import { E2E_GRANT_ROLES_MUTATION, E2E_REVOKE_ROLES_MUTATION, runMarker, type E2eStaffRole } from '@duncit/utils';
import { runAccount } from './run-account';

/**
 * Shared steps for the third batch of Partners UI specs (specs/ui/**): the
 * run's own venue, host profile and club as the mWeb fixture step built them
 * (app/mweb/__tests__/e2e/support/fixture-world.ts), found the way the portal
 * finds them — `myVenues`, `myHost`, `myAdminClubs` — by the run marker.
 *
 * Nothing here builds a record: when the fixture step did not leave what a
 * spec needs, `partnerWorld` fails with the sentence that names it. Granted
 * roles are the limited ones `grantE2eRunAccountRoles` allows, and every spec
 * that grants one revokes it in `after()`.
 */

/** A well-formed ObjectId no record carries — what an unknown link points at. */
export const NO_SUCH_ID = '00000000000000000000e2e0';

/** `useSelectedVenue`'s key (src/components/venue/useSelectedVenue.ts): the venue every Venue Studio page opens on. */
const SELECTED_VENUE_KEY = 'partners_selected_venue';

/** The run marker the fixture step names its records with: `[E2E <stamp> <surface>]`. */
export const marked = (surface: string): string => runMarker(runAccount().stamp, surface);

export interface OwnVenue {
  id: string;
  name: string;
  status: string;
  offersFood: boolean;
}

export interface PartnerWorld {
  userId: string;
  fullName: string;
  roles: string[];
  /** The approved venue (`marked('venue')`). */
  venue: OwnVenue;
  /** The venue the fixture step started and never submitted (`marked('draft venue')`), when it exists — see `draftOf`. */
  draftVenue: OwnVenue | null;
  hostId: string;
  clubId: string;
}

const WORLD = `query E2eUiP3World {
  me { user_id full_name roles }
  myVenues { id venue_name status offers_food }
  myHost { id status }
  myAdminClubs { id club_name }
}`;

interface WorldData {
  me: { user_id: string; full_name: string | null; roles: string[] };
  myVenues: Array<{ id: string; venue_name: string; status: string; offers_food: boolean | null }>;
  myHost: { id: string; status: string } | null;
  myAdminClubs: Array<{ id: string; club_name: string }>;
}

const missing = (what: string): Error =>
  new Error(
    `Fixture prerequisite: ${what}. The mWeb fixture step (specs/api/fixtures, support/fixture-world.ts) runs before this one and builds it.`,
  );

/** Sign the run account in (password CHANGED) with the run's traffic key, for the next `visitApp`. */
export function signInRunPartner(): Cypress.Chainable<string> {
  const account = runAccount();
  cy.useRunTraffic();
  return cy.apiLogin(account.email, account.password('CHANGED'));
}

/** The run's own partner records, each found by its marker — or a failure that names the missing one. */
export function partnerWorld(): Cypress.Chainable<PartnerWorld> {
  return cy.gql<WorldData>(WORLD).then((data) => {
    const venueOf = (name: string): OwnVenue | null => {
      const row = data.myVenues.find((venue) => venue.venue_name === name);
      return row ? { id: row.id, name, status: row.status, offersFood: row.offers_food === true } : null;
    };
    const venue = venueOf(marked('venue'));
    if (venue?.status !== 'APPROVED') throw missing(`no APPROVED venue named "${marked('venue')}"`);
    const draft = venueOf(marked('draft venue'));
    const draftVenue = draft && draft.status !== 'APPROVED' ? draft : null;
    if (data.myHost?.status !== 'APPROVED') throw missing('the run account has no APPROVED host profile');
    const club = data.myAdminClubs.find((row) => row.club_name === marked('club'));
    if (!club) throw missing(`the run account administers no club named "${marked('club')}"`);
    ['VENUE_OWNER', 'HOST', 'CLUB_ADMIN'].forEach((role) => {
      if (!data.me.roles.includes(role)) throw missing(`the run account does not hold ${role}`);
    });
    return {
      userId: data.me.user_id,
      fullName: data.me.full_name ?? '',
      roles: data.me.roles,
      venue,
      draftVenue,
      hostId: data.myHost.id,
      clubId: club.id,
    };
  });
}

/** The run's unapproved venue — or a failure naming the fixture spec that makes it. */
export function draftOf(world: PartnerWorld): OwnVenue {
  if (!world.draftVenue) {
    throw missing(`no unapproved venue named "${marked('draft venue')}" (fixtures/venue-publish.cy.ts ensureDraftVenue)`);
  }
  return world.draftVenue;
}

/** `visitApp`, with the Venue Studio's remembered venue set first, so every venue page opens on it. */
export function visitWithVenue(path: string, venueId: string): Cypress.Chainable<Cypress.AUTWindow> {
  cy.on('window:before:load', (win) => {
    win.localStorage.setItem(SELECTED_VENUE_KEY, venueId);
  });
  return cy.visitApp(path);
}

/** Visit `path` and wait for the server's answer to `operation`. */
export function visitAndWait(path: string, operation: string, venueId?: string): void {
  cy.interceptOperation(operation);
  if (venueId) visitWithVenue(path, venueId);
  else cy.visitApp(path);
  cy.wait(`@${operation}`);
}

/** How many requests named `name` the page has sent since this call. */
export interface OperationCount {
  sent: () => number;
}

/**
 * Count the page's requests for `name` — how a spec proves a refused form sent
 * nothing (an alias that never matched cannot be asked for its calls).
 */
export function countOperation(name: string): OperationCount {
  let sent = 0;
  cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
    if ((req.body as { operationName?: string } | undefined)?.operationName === name) sent += 1;
  });
  return { sent: () => sent };
}

/** Fail unless the page sent no `name` request. */
export function expectNotSent(count: OperationCount, name: string): void {
  cy.then(() => expect(count.sent(), `${name} requests sent`).to.equal(0));
}

const rolesInput =(roles: readonly E2eStaffRole[]) => {
  const account = runAccount();
  return { input: { stamp: account.stamp, email: account.email, roles } };
};

/** Give the run account `roles` and sign in again, so the token and `me` carry them. */
export function grantRunRoles(roles: readonly E2eStaffRole[]): Cypress.Chainable<string> {
  cy.useRunTraffic();
  cy.staffGql(E2E_GRANT_ROLES_MUTATION, rolesInput(roles));
  return signInRunPartner();
}

/** Take back what `grantRunRoles` gave. */
export function revokeRunRoles(roles: readonly E2eStaffRole[]): void {
  cy.staffGql(E2E_REVOKE_ROLES_MUTATION, rolesInput(roles));
}

const PUBLIC_FLAGS = `query E2eUiP3Flags { publicFeatureFlags { key enabled } }`;

/** Whether a public feature flag is on — read the way the portal reads it. */
export const publicFlag = (key: string): Cypress.Chainable<boolean> =>
  cy
    .gql<{ publicFeatureFlags: Array<{ key: string; enabled: boolean }> }>(PUBLIC_FLAGS, {}, { token: null })
    .then(({ publicFeatureFlags }) => publicFeatureFlags.some((flag) => flag.key === key && flag.enabled === true));

/** The E-Commerce Brand area renders only while `is_product_visible` is on (SectionGate). */
export function requireProductsOn(): void {
  publicFlag('is_product_visible').then((on) => {
    if (!on) {
      throw new Error(
        'Staging prerequisite: the is_product_visible system flag is off, so SectionGate sends every /ecomm and /ecomm-brand page to /.',
      );
    }
  });
}

/**
 * The Brand studio's specs: grant ECOMM_MANAGER before the first scenario (and
 * prove the product flag is on, without which SectionGate sends every brand
 * page home), and take it back after the last, so later specs find the
 * partner the fixture step made. Each scenario signs in again for a token and
 * a `me` that carry the role.
 */
export function asEcommManager(): void {
  before(() => {
    requireProductsOn();
    grantRunRoles(['ECOMM_MANAGER']);
  });
  beforeEach(() => {
    signInRunPartner();
  });
  after(() => {
    revokeRunRoles(['ECOMM_MANAGER']);
  });
}

/** Replace `window.open` on the page under test, so a link to mWeb is recorded instead of opened. */
export function stubWindowOpen(): void {
  cy.window().then((win) => {
    cy.stub(win, 'open').as('windowOpen');
  });
}
