/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { runAccount } from './run-account';

/**
 * What the Partners UI specs (specs/ui/*-1.cy.ts) stand on: the partner the
 * mWeb fixture step made of the run account (app/mweb/__tests__/e2e/support/
 * fixture-world.ts — an approved venue, a draft venue, an approved host
 * profile, an inactive club it administers and a FREE physical pod at its own
 * venue, every name carrying the run marker).
 *
 * Nothing here builds that world. Each spec FINDS it through the queries the
 * portal itself uses (myVenues, myHost, myAdminClubs, myHostPods) and fails
 * loudly when the fixture step did not leave it behind, because a spec that
 * quietly built its own would hide a broken fixture step.
 *
 * Every operation here is the suite's own (E2eUi…), so none shares a name with
 * an operation a spec waits on.
 */

export interface WorldVenue {
  id: string;
  name: string;
  status: string;
  capacity: number;
}

export interface PartnerWorld {
  userId: string;
  roles: string[];
  venue: WorldVenue;
  /** The second venue the fixture step starts and never submits. */
  draftVenue: WorldVenue;
  /** Every venue the account owns, as myVenues answers it. */
  venues: WorldVenue[];
  hostId: string;
  club: { id: string; name: string };
  pod: { id: string; title: string; slotId: string };
}

/** The run marker on `surface` — the exact name the fixture step gave it. */
export const marked = (surface: string): string => runMarker(runAccount().stamp, surface);

const WORLD_QUERY = `query E2eUiPartnerWorld {
  me { user_id roles }
  myVenues { id venue_name status capacity }
  myHost { id status }
  myAdminClubs { id club_name }
  myHostPods { id pod_title venue_slot_id }
}`;

interface WorldAnswer {
  me: { user_id: string; roles: string[] };
  myVenues: Array<{ id: string; venue_name: string | null; status: string; capacity: number | null }>;
  myHost: { id: string; status: string } | null;
  myAdminClubs: Array<{ id: string; club_name: string }>;
  myHostPods: Array<{ id: string; pod_title: string; venue_slot_id: string | null }>;
}

const missing = (what: string): Error =>
  new Error(
    `Fixture missing: ${what}. The Partners UI step runs after "mWeb · fixture scenarios" ` +
      '(app/mweb/__tests__/e2e/specs/api/fixtures), which builds it — see that step in this run.',
  );

const toVenue = (row: WorldAnswer['myVenues'][number]): WorldVenue => ({
  id: row.id,
  name: row.venue_name ?? '',
  status: row.status,
  capacity: Number(row.capacity ?? 0),
});

/** Sign the run account in (password CHANGED) and keep its token for `visitApp` and `gql`. */
export function signInPartner(): Cypress.Chainable<string> {
  const account = runAccount();
  return cy.apiLogin(account.email, account.password('CHANGED'));
}

/** The run's partner records, found — never built. Throws a clear error for anything absent. */
export function findPartnerWorld(): Cypress.Chainable<PartnerWorld> {
  return cy.gql<WorldAnswer>(WORLD_QUERY).then((data) => {
    const venueRow = data.myVenues.find((row) => row.venue_name === marked('venue'));
    if (venueRow?.status !== 'APPROVED') throw missing(`the approved venue "${marked('venue')}"`);
    const draftRow = data.myVenues.find((row) => row.venue_name === marked('draft venue'));
    if (draftRow?.status !== 'DRAFT') throw missing(`the draft venue "${marked('draft venue')}"`);
    if (data.myHost?.status !== 'APPROVED') throw missing('the approved host profile');
    const club = data.myAdminClubs.find((row) => row.club_name === marked('club'));
    if (!club) throw missing(`the club "${marked('club')}" the account administers`);
    const pod = data.myHostPods.find((row) => row.pod_title === marked('free pod'));
    if (!pod?.venue_slot_id) throw missing(`the free pod "${marked('free pod')}" on its own slot`);
    for (const role of ['VENUE_OWNER', 'HOST', 'CLUB_ADMIN']) {
      if (!data.me.roles.includes(role)) throw missing(`the ${role} role the approvals grant`);
    }
    const world: PartnerWorld = {
      userId: data.me.user_id,
      roles: data.me.roles,
      venue: toVenue(venueRow),
      draftVenue: toVenue(draftRow),
      venues: data.myVenues.map(toVenue),
      hostId: data.myHost.id,
      club: { id: club.id, name: club.club_name },
      pod: { id: pod.id, title: pod.pod_title, slotId: pod.venue_slot_id },
    };
    return cy.wrap(world, { log: false });
  });
}

const FLAGS_QUERY = `query E2eUiFeatureFlags { publicFeatureFlags { key enabled } }`;

/** Whether a public feature flag (e.g. `auto_pods`) is on for this server. */
export function featureFlag(key: string): Cypress.Chainable<boolean> {
  return cy
    .gql<{ publicFeatureFlags: Array<{ key: string; enabled: boolean }> }>(FLAGS_QUERY, {}, { token: null })
    .then((data) => data.publicFeatureFlags.some((flag) => flag.key === key && flag.enabled));
}

const PUBLIC_VENUES_QUERY = `query E2eUiPublicVenues { publicVenues { id owner_user_id } }`;

/** An approved, public venue some other partner owns — never touched, only named in a refused request. */
export function foreignVenueId(world: PartnerWorld): Cypress.Chainable<string> {
  return cy
    .gql<{ publicVenues: Array<{ id: string; owner_user_id: string }> }>(PUBLIC_VENUES_QUERY, {}, { token: null })
    .then(({ publicVenues }) => {
      const other = publicVenues.find((venue) => venue.owner_user_id !== world.userId);
      if (!other) throw new Error('Staging prerequisite: no public venue owned by another partner.');
      return other.id;
    });
}

/* ------------------------------------------------------------------ copy */

const LOCALE_QUERY = `query E2eUiLocale { me { locale } }`;
const COPY_QUERY = `query E2eUiCopy($locale: String!) { publicTranslations(locale: $locale) { key value } }`;

let catalogue = new Map<string, string>();

/**
 * Load the server's catalogue for the account's language, the one the portal
 * renders first (server-first localization; the shipped bundle is only the
 * fallback). Call in `before()`, after `signInPartner()`.
 */
export function loadCopy(): Cypress.Chainable<null> {
  return cy.gql<{ me: { locale: string | null } }>(LOCALE_QUERY).then(({ me }) =>
    cy
      .gql<{ publicTranslations: Array<{ key: string; value: string }> }>(
        COPY_QUERY,
        { locale: me.locale || 'en' },
        { token: null },
      )
      .then((data) => {
        catalogue = new Map(data.publicTranslations.map((row) => [row.key, row.value]));
        return cy.wrap(null, { log: false });
      }),
  );
}

/** How `key` reads on screen: the server's copy, else the shipped English; `{name}` placeholders filled. */
export function copyOf(key: string, shipped: string, vars: Record<string, string | number> = {}): string {
  const template = catalogue.get(key) ?? shipped;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/* ------------------------------------------------------------- browser */

/** Remember a venue as the one every Venue Studio page opens on (useSelectedVenue). */
export function rememberVenue(venueId: string): void {
  cy.on('window:before:load', (win) => {
    win.localStorage.setItem('partners_selected_venue', venueId);
  });
}

/** Remember the studio the partner was last in (useActiveStudio). */
export function rememberStudio(role: 'CLUB_ADMIN' | 'VENUE_OWNER' | 'HOST'): void {
  cy.on('window:before:load', (win) => {
    win.localStorage.setItem('partners_active_studio', role);
  });
}

/** Open the MUI select whose TextField carries `testId` and pick the option with `value`. */
export function chooseOption(testId: string, value: string): void {
  cy.byTestId(testId).find('[role="combobox"]').click();
  cy.get(`[role="listbox"] [role="option"][data-value="${value}"]`).click();
}

/** A sidebar entry (@duncit/shell NavTree leaf) by the route it opens. */
export const navLeaf = (to: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.get(`[data-testid="shell-nav-leaf"][href="${to}"]`);

/** One DuncitTable row by its row id (the record id `getRowId` returns). */
export const gridRow = (id: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.byTestId('duncit-table-grid').find(`.ag-row[row-id="${id}"]`);

export interface OperationCount {
  /** How many requests carrying the operation have left the page so far. */
  sent: () => number;
}

/**
 * Count requests carrying `name`, so a spec can prove a form refused BEFORE
 * any request (validation) rather than after a round trip. Only watches.
 */
export function countOperation(name: string): OperationCount {
  let sent = 0;
  cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
    if ((req.body as { operationName?: string } | undefined)?.operationName === name) sent += 1;
  });
  return { sent: () => sent };
}

/** Assert `count` saw no request — call it after the UI showed its refusal. */
export function expectNotSent(count: OperationCount, name: string): void {
  cy.then(() => {
    expect(count.sent(), `${name} requests sent`).to.equal(0);
  });
}
