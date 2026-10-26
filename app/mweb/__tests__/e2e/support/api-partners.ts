/// <reference types="cypress" />
import { expectRefused, type Refusal } from './access-steps';
import type { GqlBody } from './commands';
import { runAccount } from './run-account';

/**
 * Shared steps for the partners-area API specs (specs/api/partners/**): the
 * partner studios, the Venues / Hosts / Clubs / Pods / Onboarding / Products
 * consoles, and the pet store (ecomm.duncit.com) with its admin.
 *
 * The run account owns no venue, hosts no pod, administers no club and owns no
 * brand, so any APPROVED public venue is, by construction, someone else's. It
 * is only ever read from `publicVenues`; every call a spec aims at it is one
 * whose ownership check runs before any write, and where a broken check could
 * still reach a write the spec also sends an input the next check refuses.
 */

/** `refuse` in server/src/modules/platform/settings/featureFlag.gate.ts. */
export const FEATURE_DISABLED: Refusal = { code: 'FEATURE_DISABLED', message: 'This feature is currently unavailable.' };

/** `assertPortalLogin` in server/src/modules/portals/portal.gate.ts. */
export const NO_PORTAL_ACCESS: Refusal = { code: 'FORBIDDEN', message: 'You do not have access to this portal' };

/**
 * The one flag every product surface sits behind (server featureFlag.gate.ts
 * PRODUCT_VISIBILITY_FLAG; packages/app-settings useProductVisibility.ts).
 * Off, `gateResolvers` answers its refusal BEFORE the operation's own guard.
 */
const PRODUCT_FLAG = 'is_product_visible';

const PUBLIC_FLAGS = `query E2ePartnersPublicFlags { publicFeatureFlags { key enabled } }`;

/** Whether the product surfaces are switched on right now. */
export function productFlagOn(): Cypress.Chainable<boolean> {
  return cy
    .gql<{ publicFeatureFlags: Array<{ key: string; enabled: boolean }> }>(PUBLIC_FLAGS, {}, { token: null })
    .then(({ publicFeatureFlags }) => publicFeatureFlags.some((flag) => flag.key === PRODUCT_FLAG && flag.enabled));
}

/** A product operation: the guard's own refusal while the shop is on, the flag's refusal while it is off. */
export const productRefusal = (flagOn: boolean, refusal: Refusal): Refusal => (flagOn ? refusal : FEATURE_DISABLED);

/** One caller of a refusal check: their token (null = signed out) and what they must be told. */
export type Caller = readonly [token: string | null, refusal: Refusal];

/** `field` refuses every caller exactly as listed, and carries no data for any of them. */
export function expectEachRefused(
  field: string,
  query: string,
  variables: Record<string, unknown>,
  callers: readonly Caller[],
): void {
  callers.forEach(([token, refusal]) => {
    cy.gqlRaw(query, variables, { token }).then((body) => expectRefused(field, body, refusal));
  });
}

/** The call succeeded: no error, and `field` is a table page with a whole-number total. Yields that total. */
export function expectPage(field: string, body: GqlBody): number {
  expect(body.errors, `${field} errors`).to.be.undefined;
  const page = body.data?.[field] as { total?: unknown } | null | undefined;
  expect(page?.total, `${field} total`).to.be.a('number').and.to.be.at.least(0);
  return page?.total as number;
}

/** The call succeeded and `field` reads exactly `expected`. */
export function expectAnswer(field: string, body: GqlBody, expected: unknown): void {
  expect(body.errors, `${field} errors`).to.be.undefined;
  expect(body.data?.[field], field).to.deep.equal(expected);
}

const PUBLIC_VENUES = `query E2ePartnersPublicVenues { publicVenues { id } }`;

/**
 * An approved, active venue the run account does not own: the run account owns
 * none (specs/api/apps/member-own-data.cy.ts MD-07), so the first listed one.
 */
export function foreignVenueId(): Cypress.Chainable<string> {
  return cy.gql<{ publicVenues: Array<{ id: string }> }>(PUBLIC_VENUES, {}, { token: null }).then(({ publicVenues }) => {
    const [venue] = publicVenues;
    if (!venue) throw new Error('The server lists no public venue: the ownership checks need one.');
    return venue.id;
  });
}

const PORTAL_LOGIN = `mutation E2ePartnersPortalLogin($input: LoginInput!) { login(input: $input) { token } }`;

/** Sign the run account in to a console portal — `portal_key` is that portal's appConfig.key. */
export function portalLogin(portalKey: string): Cypress.Chainable<GqlBody> {
  const account = runAccount();
  return cy.gqlRaw(
    PORTAL_LOGIN,
    { input: { email: account.email, password: account.password('CHANGED'), portal_key: portalKey } },
    { token: null },
  );
}

/** The portal's server-side login gate turns the run account away. */
export function expectPortalRefused(portalKey: string): void {
  portalLogin(portalKey).then((body) => expectRefused('login', body, NO_PORTAL_ACCESS));
}

/** The portal's server-side login gate lets the run account in. */
export function expectPortalOpens(portalKey: string): void {
  portalLogin(portalKey).then((body) => {
    expect(body.errors, `${portalKey} sign-in errors`).to.be.undefined;
    const login = body.data?.login as { token?: unknown } | null | undefined;
    expect(login?.token, `${portalKey} sign-in token`).to.be.a('string').and.not.be.empty;
  });
}
