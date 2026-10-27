/// <reference types="cypress" />
import { E2E_GRANT_ROLES_MUTATION, E2E_REVOKE_ROLES_MUTATION, runMarker, type E2eStaffRole } from '@duncit/utils';
import { runAccount } from './run-account';

/**
 * Shared steps for the second batch of Partners UI specs (specs/ui/**): the
 * run's own venue, host profile, club and FREE pod as the mWeb fixture step
 * built them (app/mweb/__tests__/e2e/support/fixture-world.ts), found the way
 * the portal finds them — `myVenues`, `myHost`, `myAdminClubs`, `myHostPods` —
 * by the run marker.
 *
 * Nothing here changes a record the fixture step built. A spec that needs a pod
 * to cancel or delete makes its OWN (`ownSparePod`, a FREE pod on a ₹0 slot at
 * the run's venue, both named with the marker) and frees the slot afterwards
 * (`releaseSpareSlot`); the pods themselves go with the account
 * (server e2eRun.purge.ts removes every pod the run hosts).
 */

/** A well-formed ObjectId no record carries. */
export const NO_SUCH_ID = '00000000000000000000e2e2';

/** The run marker the fixture step names its records with: `[E2E <stamp> <surface>]`. */
export const marked = (surface: string): string => runMarker(runAccount().stamp, surface);

/** Wide enough that every DuncitTable column — the actions one last — is rendered without a horizontal scroll. */
export const TABLE_VIEWPORT: readonly [number, number] = [1920, 1080];

export interface RunPod {
  id: string;
  title: string;
  slotId: string;
}

export interface PartnerWorld2 {
  userId: string;
  fullName: string;
  venueId: string;
  venueName: string;
  clubId: string;
  clubName: string;
  /** The club's sub-category; the fixture club is created without one. */
  clubCategoryId: string | null;
  /** The FREE physical pod the run hosts at its own venue (`marked('free pod')`). */
  freePod: RunPod;
}

const WORLD = `query E2eUiP2World {
  me { user_id full_name roles }
  myVenues { id venue_name status }
  myHost { id status }
  myAdminClubs { id club_name category_id }
  myHostPods { id pod_title venue_slot_id club_id }
}`;

interface WorldData {
  me: { user_id: string; full_name: string | null; roles: string[] };
  myVenues: Array<{ id: string; venue_name: string; status: string }>;
  myHost: { id: string; status: string } | null;
  myAdminClubs: Array<{ id: string; club_name: string; category_id: string | null }>;
  myHostPods: Array<{ id: string; pod_title: string; venue_slot_id: string | null; club_id: string }>;
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
export function partnerWorld2(): Cypress.Chainable<PartnerWorld2> {
  return cy.gql<WorldData>(WORLD).then((data) => {
    ['VENUE_OWNER', 'HOST', 'CLUB_ADMIN'].forEach((role) => {
      if (!data.me.roles.includes(role)) throw missing(`the run account does not hold ${role}`);
    });
    const venue = data.myVenues.find((row) => row.venue_name === marked('venue'));
    if (venue?.status !== 'APPROVED') throw missing(`no APPROVED venue named "${marked('venue')}"`);
    if (data.myHost?.status !== 'APPROVED') throw missing('the run account has no APPROVED host profile');
    const club = data.myAdminClubs.find((row) => row.club_name === marked('club'));
    if (!club) throw missing(`the run account administers no club named "${marked('club')}"`);
    const pod = data.myHostPods.find((row) => row.pod_title === marked('free pod'));
    if (!pod?.venue_slot_id) throw missing(`the run hosts no live pod named "${marked('free pod')}"`);
    return {
      userId: data.me.user_id,
      fullName: data.me.full_name ?? '',
      venueId: venue.id,
      venueName: venue.venue_name,
      clubId: club.id,
      clubName: club.club_name,
      clubCategoryId: club.category_id,
      freePod: { id: pod.id, title: pod.pod_title, slotId: pod.venue_slot_id },
    };
  });
}

const CANCELLED_CLUB_PODS = `query E2eUiP2CancelledPods($club: ID, $query: TableQueryInput) {
  clubAdminPodsTable(club_id: $club, query: $query, status: CANCELLED) { rows { id pod_title } }
}`;

/** The pod the fixture step's host-pods spec cancelled (`marked('pod to cancel')`), read as the club admin. */
export function cancelledFixturePod(clubId: string): Cypress.Chainable<{ id: string; title: string }> {
  const title = marked('pod to cancel');
  return cy
    .gql<{ clubAdminPodsTable: { rows: Array<{ id: string; pod_title: string }> } }>(CANCELLED_CLUB_PODS, {
      club: clubId,
      query: { search: title, page: 1, page_size: 25 },
    })
    .then(({ clubAdminPodsTable }) => {
      const row = clubAdminPodsTable.rows.find((pod) => pod.pod_title === title);
      if (!row) throw missing(`no cancelled pod named "${title}" in the run's club (fixtures/host-pods.cy.ts HPD-06)`);
      return { id: row.id, title };
    });
}

const PUBLIC_PODS = `query E2eUiP2PublicPods { pods(filter: { is_active: true }) { id club_id pod_hosts_id } }`;

/** A live pod of some other club, which the run neither hosts nor administers. */
export function foreignPodId(world: PartnerWorld2): Cypress.Chainable<string> {
  return cy
    .gql<{ pods: Array<{ id: string; club_id: string | null; pod_hosts_id: string[] }> }>(PUBLIC_PODS)
    .then(({ pods }) => {
      const pod = pods.find((row) => row.club_id && row.club_id !== world.clubId && !row.pod_hosts_id.includes(world.userId));
      if (!pod) throw new Error('Staging prerequisite: no live pod of another club is listed, so the isolation checks have nothing to aim at.');
      return pod.id;
    });
}

const PUBLIC_CLUBS = `query E2eUiP2PublicClubs { clubs(filter: { is_active: true }) { id admin_user_ids } }`;

/** An active club the run account does not administer. */
export function foreignClubId(world: PartnerWorld2): Cypress.Chainable<string> {
  return cy
    .gql<{ clubs: Array<{ id: string; admin_user_ids: string[] }> }>(PUBLIC_CLUBS)
    .then(({ clubs }) => {
      const club = clubs.find((row) => row.id !== world.clubId && !row.admin_user_ids.includes(world.userId));
      if (!club) throw new Error('Staging prerequisite: no active club of another admin is listed.');
      return club.id;
    });
}

const VENUE_SLOTS = `query E2eUiP2Slots($venue: ID!) { venueSlots(venue_id: $venue) { id status notes start_at } }`;
const CREATE_SLOTS = `mutation E2eUiP2CreateSlots($input: BulkCreateVenueSlotsInput!) {
  createVenueSlots(input: $input) { id status notes start_at }
}`;
const DELETE_SLOT = `mutation E2eUiP2DeleteSlot($id: ID!) { deleteVenueSlot(slot_id: $id) }`;
const POD_MEDIA = `query E2eUiP2PodMedia($id: ID!) { pod(pod_doc_id: $id) { pod_images_and_videos { url type } } }`;
const CREATE_POD = `mutation E2eUiP2CreatePod($input: CreatePodInput!) {
  createPartnerPod(input: $input) { id pod_title venue_slot_id }
}`;

interface SlotRow {
  id: string;
  status: string;
  notes: string;
  start_at: string;
}

/** The slot's place in the calendar: `days` ahead at 10:00 UTC, two hours long, marked `note`. */
export interface SparePlan {
  title: string;
  note: string;
  days: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Inside the fixture venue's capacity (fixture-world FIXTURE_CAPACITY = 20). */
const SPARE_CAPACITY = 20;

const utcDayAt10 = (days: number): string => {
  const today = new Date();
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return new Date(midnight + days * DAY_MS + 10 * HOUR_MS).toISOString();
};

/** The ₹0 slot named `note` while it is still open — made now when there is none. */
function openSlot(venueId: string, plan: SparePlan): Cypress.Chainable<SlotRow> {
  return cy.gql<{ venueSlots: SlotRow[] }>(VENUE_SLOTS, { venue: venueId }).then(({ venueSlots }) => {
    const open = venueSlots.find((slot) => slot.notes === plan.note && slot.status === 'AVAILABLE');
    if (open) return cy.wrap(open, { log: false });
    const start = utcDayAt10(plan.days);
    const slot = {
      start_at: start,
      end_at: new Date(Date.parse(start) + 2 * HOUR_MS).toISOString(),
      price: 0,
      capacity: SPARE_CAPACITY,
      notes: plan.note,
    };
    return cy
      .gql<{ createVenueSlots: SlotRow[] }>(CREATE_SLOTS, { input: { venue_id: venueId, slots: [slot] } })
      .then(({ createVenueSlots }) => cy.wrap(createVenueSlots[0], { log: false }));
  });
}

/**
 * A FREE physical pod of the run's own, on its own ₹0 slot, in the run's club —
 * what a spec cancels or deletes, so the fixture's free pod is never touched.
 * Built the way fixture-world's `createOwnFreePod` builds the free pod, reusing
 * that pod's image.
 */
export function ownSparePod(world: PartnerWorld2, plan: SparePlan): Cypress.Chainable<RunPod> {
  return cy
    .gql<{ pod: { pod_images_and_videos: Array<{ url: string; type: string }> } }>(POD_MEDIA, { id: world.freePod.id })
    .then(({ pod }) =>
      openSlot(world.venueId, plan).then((slot) =>
        cy
          .gql<{ createPartnerPod: { id: string; pod_title: string; venue_slot_id: string } }>(CREATE_POD, {
            input: {
              pod_title: plan.title,
              pod_description: marked(`${plan.title} description`),
              pod_hosts_id: [world.userId],
              club_id: world.clubId,
              venue_id: world.venueId,
              venue_slot_id: slot.id,
              pod_mode: 'PHYSICAL',
              pod_type: 'FREE',
              pod_amount: 0,
              no_of_spots: SPARE_CAPACITY / 2,
              pod_date_time: slot.start_at,
              pod_images_and_videos: pod.pod_images_and_videos.filter((media) => media.type === 'IMAGE'),
            },
          })
          .then(({ createPartnerPod }) => ({
            id: createPartnerPod.id,
            title: createPartnerPod.pod_title,
            slotId: createPartnerPod.venue_slot_id,
          })),
      ),
    );
}

/** Delete the spare pod's slot once the cancel has freed it (a slot still booked is left alone). */
export function releaseSpareSlot(venueId: string, note: string): void {
  cy.gql<{ venueSlots: SlotRow[] }>(VENUE_SLOTS, { venue: venueId }).then(({ venueSlots }) => {
    venueSlots
      .filter((slot) => slot.notes === note && slot.status === 'AVAILABLE')
      .forEach((slot) => {
        cy.gql(DELETE_SLOT, { id: slot.id });
      });
  });
}

/** Visit `path` and wait for the server's answer to `operation`. */
export function visitAndWait(path: string, operation: string): void {
  cy.interceptOperation(operation);
  cy.visitApp(path);
  cy.wait(`@${operation}`);
}

/** How many requests named `name` the page has sent since this call. */
export interface SentCount {
  sent: () => number;
}

/** Count the page's requests for `name` — how a spec proves a refused form sent nothing. */
export function countOperation(name: string): SentCount {
  let sent = 0;
  cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
    if ((req.body as { operationName?: string } | undefined)?.operationName === name) sent += 1;
  });
  return { sent: () => sent };
}

/** Fail unless the page sent no `name` request. */
export function expectNotSent(count: SentCount, name: string): void {
  cy.then(() => expect(count.sent(), `${name} requests sent`).to.equal(0));
}

/** Open a MUI select by its root test id and pick the option with `optionTestId`. */
export function pickOption(selectTestId: string, optionTestId: string): void {
  cy.byTestId(selectTestId).find('[role="combobox"]').click();
  cy.byTestId(optionTestId).click();
}

/** Type into the table's search box and wait for the query that answers it. */
export function searchTable(operation: string, text: string): void {
  cy.interceptOperation(operation);
  cy.byTestId('table-toolbar-search').should('be.enabled').type(text, { delay: 0 });
  cy.wait(`@${operation}`);
}

const rolesInput = (roles: readonly E2eStaffRole[]) => {
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

const PUBLIC_FLAGS = `query E2eUiP2Flags { publicFeatureFlags { key enabled } }`;

/** Whether a public feature flag is on — read the way the portal reads it (`useFeatureFlag`). */
export const publicFlag = (key: string): Cypress.Chainable<boolean> =>
  cy
    .gql<{ publicFeatureFlags: Array<{ key: string; enabled: boolean }> }>(PUBLIC_FLAGS, {}, { token: null })
    .then(({ publicFeatureFlags }) => publicFeatureFlags.some((flag) => flag.key === key && flag.enabled === true));

/** The DuncitTable row `<tableId>-row-<rowId>`, once it shows every text given. */
export function tableRow(tableId: string, rowId: string, texts: readonly string[]): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.byTestId(`${tableId}-row-${rowId}`).should(($row) => {
    for (const text of texts) {
      expect($row).to.contain.text(text);
    }
  });
}

/** Click a row inside its first column, which holds text rather than a control. */
export function openRow(tableId: string, rowId: string, texts: readonly string[]): void {
  tableRow(tableId, rowId, texts).click(24, 16);
}
