/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunAs } from './access-steps';
import { marked, memberId } from './api-apps';
import { DATE_OF_BIRTH, PLACEHOLDER_DOCUMENT, PLACEHOLDER_ID_NUMBER } from './pod-payout-world';
import { runAccount } from './run-account';

/**
 * The fixture world: what the run account owns as a partner, so the API specs
 * under specs/api/fixtures/ can test an owner's and a host's own side.
 *
 * Every record is made through the flow a real partner (or the staff member
 * who reviews them) uses — nothing is written that a person could not:
 *   venue  submitVenueStep1..3 + submitVenueFinal as the member, then
 *          approveVenue with ONBOARDING_MANAGER granted for that one call;
 *   host   submitHostStep1..3 + submitHostFinal, then approveHost the same way;
 *   club   createClub with CITY_ADMIN granted, naming the run account its
 *          admin; switched off (is_active false) so no member lists it;
 *   pod    a ₹0 slot at the venue (createVenueSlots), then a FREE physical
 *          pod on it (createPartnerPod) — an own-venue slot books instantly.
 * Each granted role is revoked as soon as its call is answered. The city and
 * the venue type are the server's own (public queries); every name carries the
 * run marker, so each `ensure…` finds the run's record before it builds one —
 * specs/api/** run alphabetically and any of them may be the first to ask.
 *
 * Approval makes the account a VENUE_OWNER, a HOST and a CLUB_ADMIN, which the
 * member-only specs must never see: the workflow runs specs/api/fixtures/ after
 * the staff portals, and the purge (server e2eRun.purge.ts) removes it all.
 */

export interface FixtureVenue {
  id: string;
  name: string;
  locationId: string;
}
export interface FixtureHost {
  id: string;
  userId: string;
}
export interface FixtureClub {
  id: string;
  name: string;
}
export interface FixturePod {
  id: string;
  title: string;
  venueId: string;
  slotId: string;
  clubId: string;
}
export interface FixtureWorld {
  userId: string;
  venue: FixtureVenue;
  host: FixtureHost;
  club: FixtureClub;
  pod: FixturePod;
}

/** The venue's one space and how many it seats; the pod and its slot are sized from it. */
export const FIXTURE_CAPACITY = 20;
/** Days ahead the free pod's slot starts — inside every venue's default 60-day advance window. */
const POD_SLOT_DAY = 14;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** `days` from today at `hour`:00 UTC, as ISO — a fixed point every spec of the run computes alike. */
export const utcDayAt = (days: number, hour: number): string => {
  const today = new Date();
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return new Date(midnight + days * DAY_MS + hour * HOUR_MS).toISOString();
};

const MY_VENUES = `query E2eFixtureMyVenues { myVenues { id venue_name status location_id } }`;
const VENUE_CONFIG = `query E2eFixtureVenueConfig { venueRegistrationConfig { venue_types } }`;
const LOCATIONS = `query E2eFixtureLocations {
  locations(filter: { is_active: true }) { id city state location_pincode location_zones { zone_name } }
}`;
const VENUE_STEP1 = `mutation E2eFixtureVenueStep1($venue: ID, $input: VenueStep1Input!) {
  submitVenueStep1(venue_id: $venue, input: $input) { id }
}`;
const VENUE_STEP2 = `mutation E2eFixtureVenueStep2($venue: ID, $input: VenueStep2Input!) {
  submitVenueStep2(venue_id: $venue, input: $input) { id }
}`;
const VENUE_STEP3 = `mutation E2eFixtureVenueStep3($venue: ID, $input: VenueStep3Input!) {
  submitVenueStep3(venue_id: $venue, input: $input) { id }
}`;
const VENUE_FINAL = `mutation E2eFixtureVenueFinal($venue: ID) { submitVenueFinal(venue_id: $venue) { id status } }`;
const APPROVE_VENUE = `mutation E2eFixtureApproveVenue($id: ID!, $notes: String) {
  approveVenue(venue_doc_id: $id, notes: $notes) { id status }
}`;
const MY_HOST = `query E2eFixtureMyHost { myHost { id status user_id } }`;
const HOST_STEP1 = `mutation E2eFixtureHostStep1($input: HostStep1Input!) { submitHostStep1(input: $input) { id } }`;
const HOST_STEP2 = `mutation E2eFixtureHostStep2($input: HostStep2Input!) { submitHostStep2(input: $input) { id } }`;
const HOST_STEP3 = `mutation E2eFixtureHostStep3($input: HostStep3Input!) { submitHostStep3(input: $input) { id } }`;
const HOST_FINAL = `mutation E2eFixtureHostFinal { submitHostFinal { id status } }`;
const APPROVE_HOST = `mutation E2eFixtureApproveHost($id: ID!, $notes: String) {
  approveHost(host_doc_id: $id, notes: $notes) { id status }
}`;
const MY_CLUBS = `query E2eFixtureMyClubs { myAdminClubs { id club_name } }`;
const CREATE_CLUB = `mutation E2eFixtureCreateClub($input: CreateClubInput!) {
  createClub(input: $input) { id club_name }
}`;
const MY_HOST_PODS = `query E2eFixtureMyHostPods {
  myHostPods { id pod_title venue_id venue_slot_id club_id }
}`;
const VENUE_SLOTS = `query E2eFixtureVenueSlots($venue: ID!) {
  venueSlots(venue_id: $venue) { id status notes start_at }
}`;
const CREATE_SLOTS = `mutation E2eFixtureCreateSlots($input: BulkCreateVenueSlotsInput!) {
  createVenueSlots(input: $input) { id status notes start_at }
}`;
const POD_IMAGES = `query E2eFixturePodImages {
  pods(filter: { is_active: true }) { pod_images_and_videos { url type } }
}`;
const CREATE_POD = `mutation E2eFixtureCreatePod($input: CreatePodInput!) {
  createPartnerPod(input: $input) { id pod_title venue_id venue_slot_id club_id }
}`;

interface VenueRow {
  id: string;
  venue_name: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  location_id: string | null;
}
interface HostRow {
  id: string;
  status: VenueRow['status'];
  user_id: string;
}
export interface SlotRow {
  id: string;
  status: string;
  notes: string;
  start_at: string;
}
export interface PodRow {
  id: string;
  pod_title: string;
  venue_id: string | null;
  venue_slot_id: string | null;
  club_id: string;
}

/** Sign the run account in as whatever it has become — a partner, unlike `signInRunMember`, is not a plain member. */
export function signInRunPartner(): Cypress.Chainable<string> {
  const account = runAccount();
  cy.useRunTraffic();
  return cy.apiLogin(account.email, account.password('CHANGED'));
}

/** Make one call with `roles` granted, and take them back before anything else runs. */
function asStaff<T>(
  roles: readonly E2eStaffRole[],
  call: (token: string) => Cypress.Chainable<T>,
): Cypress.Chainable<T> {
  return signInRunAs(roles).then((token) =>
    call(token).then((answer) => {
      revokeRunRoles(roles);
      return cy.wrap(answer, { log: false });
    }),
  );
}

/** The run's own record named `name` in `rows`, or null. */
const named = <T>(rows: T[], name: string, nameOf: (row: T) => string): T | null =>
  rows.find((row) => nameOf(row) === name) ?? null;

interface PlaceInput {
  location_id: string;
  locality?: string;
  city: string;
  state: string;
  postal_code: string;
}

/** The first active city on the server, with its first locality when it has any. */
function serverCity(token: string): Cypress.Chainable<PlaceInput> {
  return cy
    .gql<{
      locations: Array<{
        id: string;
        city: string;
        state: string;
        location_pincode: string;
        location_zones: Array<{ zone_name: string }>;
      }>;
    }>(LOCATIONS, {}, { token })
    .then(({ locations }) => {
      const [city] = locations;
      if (!city) {
        throw new Error('Staging prerequisite: no active city (Admin > Locations), so no venue can be registered.');
      }
      const [zone] = city.location_zones;
      return {
        location_id: city.id,
        ...(zone ? { locality: zone.zone_name } : {}),
        city: city.city,
        state: city.state,
        postal_code: city.location_pincode,
      };
    });
}

/** Step 1 (details and place) of the venue application `venueId` — or of the open draft, made when there is none. */
function venueStep1(token: string, venueId: string | null, name: string): Cypress.Chainable<string> {
  return cy.gql<{ venueRegistrationConfig: { venue_types: string[] } }>(VENUE_CONFIG, {}, { token }).then((config) =>
    serverCity(token).then((place) => {
      const step1 = {
        venue_name: name,
        venue_type: config.venueRegistrationConfig.venue_types[0],
        capacity: FIXTURE_CAPACITY,
        capacity_items: [{ label: marked('venue space'), capacity: FIXTURE_CAPACITY }],
        description: marked('venue description'),
        address_line1: marked('venue address'),
        ...place,
      };
      return cy
        .gql<{ submitVenueStep1: { id: string } }>(VENUE_STEP1, { venue: venueId, input: step1 }, { token })
        .then(({ submitVenueStep1 }) => submitVenueStep1.id);
    }),
  );
}

/** Steps 1-3 and the final submit of the venue application `venueId` (or the open draft when null). */
function registerVenue(token: string, venueId: string | null, name: string): Cypress.Chainable<string> {
  const account = runAccount();
  return venueStep1(token, venueId, name).then((venue) => {
    const step3 = { owner_name: marked('venue owner'), owner_email: account.email, owner_phone: account.phone };
    cy.gql(VENUE_STEP2, { venue, input: { documents: [] } }, { token });
    cy.gql(VENUE_STEP3, { venue, input: step3 }, { token });
    return cy.gql(VENUE_FINAL, { venue }, { token }).then(() => venue);
  });
}

/**
 * A second venue the run starts registering and never submits — what an
 * unapproved venue looks like. The approved venue is ensured first: a step 1
 * without a venue id reuses the caller's open draft, so the draft must never be
 * the approved venue's own application.
 */
export function ensureDraftVenue(token: string): Cypress.Chainable<FixtureVenue> {
  const name = marked('draft venue');
  return ensureVenue(token).then(() =>
    cy.gql<{ myVenues: VenueRow[] }>(MY_VENUES, {}, { token }).then(({ myVenues }) => {
      const found = named(myVenues, name, (row) => row.venue_name);
      if (found) return cy.wrap({ id: found.id, name, locationId: found.location_id ?? '' }, { log: false });
      return venueStep1(token, null, name).then(() => ensureDraftVenue(token));
    }),
  );
}

/** The run's approved venue — registered and approved now if the run has none yet. */
export function ensureVenue(token: string): Cypress.Chainable<FixtureVenue> {
  const name = marked('venue');
  return cy.gql<{ myVenues: VenueRow[] }>(MY_VENUES, {}, { token }).then(({ myVenues }) => {
    const found = named(myVenues, name, (row) => row.venue_name);
    if (found?.status === 'APPROVED') {
      return cy.wrap({ id: found.id, name, locationId: found.location_id ?? '' }, { log: false });
    }
    const submitted =
      found?.status === 'SUBMITTED' ? cy.wrap(found.id, { log: false }) : registerVenue(token, found?.id ?? null, name);
    return submitted.then((venueId) =>
      asStaff(['ONBOARDING_MANAGER'], (staff) =>
        cy.gql(APPROVE_VENUE, { id: venueId, notes: marked('venue approval') }, { token: staff }),
      ).then(() => ensureVenue(token)),
    );
  });
}

/** The run's approved host profile — applied for and approved now if the run has none yet. */
export function ensureHost(token: string): Cypress.Chainable<FixtureHost> {
  const account = runAccount();
  return cy.gql<{ myHost: HostRow | null }>(MY_HOST, {}, { token }).then(({ myHost }) => {
    if (myHost?.status === 'APPROVED') return cy.wrap({ id: myHost.id, userId: myHost.user_id }, { log: false });
    if (myHost?.status !== 'SUBMITTED') {
      const step1 = { full_name: marked('host'), email: account.email, phone: account.phone, dob: DATE_OF_BIRTH };
      const step2 = {
        aadhar_number: PLACEHOLDER_ID_NUMBER,
        pan_number: PLACEHOLDER_ID_NUMBER,
        passport_photo_url: PLACEHOLDER_DOCUMENT,
      };
      cy.gql(HOST_STEP1, { input: step1 }, { token });
      cy.gql(HOST_STEP2, { input: step2 }, { token });
      const step3 = { police_verification_url: PLACEHOLDER_DOCUMENT, full_address: marked('host address') };
      cy.gql(HOST_STEP3, { input: step3 }, { token });
      cy.gql(HOST_FINAL, {}, { token });
    }
    return cy.gql<{ myHost: HostRow }>(MY_HOST, {}, { token }).then((applied) =>
      asStaff(['ONBOARDING_MANAGER'], (staff) =>
        cy.gql(APPROVE_HOST, { id: applied.myHost.id, notes: marked('host approval') }, { token: staff }),
      ).then(() => ensureHost(token)),
    );
  });
}

/** The run's own club, which it administers — created now (switched off) if the run has none yet. */
export function ensureClub(token: string): Cypress.Chainable<FixtureClub> {
  const name = marked('club');
  type Clubs = { myAdminClubs: Array<{ id: string; club_name: string }> };
  return cy.gql<Clubs>(MY_CLUBS, {}, { token }).then(({ myAdminClubs }) => {
    const found = named(myAdminClubs, name, (row) => row.club_name);
    if (found) return cy.wrap({ id: found.id, name }, { log: false });
    return memberId(token).then((userId) => {
      const input = {
        club_name: name,
        club_description: marked('club description'),
        admin_user_ids: [userId],
        is_active: false,
      };
      return asStaff(['CITY_ADMIN'], (staff) => cy.gql(CREATE_CLUB, { input }, { token: staff })).then(() =>
        ensureClub(token),
      );
    });
  });
}

/** An image an existing pod already shows — the free pod needs one, and nothing is uploaded for it. */
function samplePodImage(token: string): Cypress.Chainable<string> {
  return cy
    .gql<{ pods: Array<{ pod_images_and_videos: Array<{ url: string; type: string }> }> }>(POD_IMAGES, {}, { token })
    .then(({ pods }) => {
      const image = pods.flatMap((pod) => pod.pod_images_and_videos).find((media) => media.type === 'IMAGE');
      if (!image) throw new Error('Staging prerequisite: no listed pod has an image to reuse for the fixture pod.');
      return image.url;
    });
}

/** Where an open slot sits: `days` ahead at `hour`:00 UTC, two hours long, its notes the marker `note`. */
export interface SlotPlan {
  note: string;
  days: number;
  hour: number;
}

/** A ₹0 slot at the venue as `plan` places it — reused while it is still open. */
export function ensureOpenSlot(token: string, venueId: string, plan: SlotPlan): Cypress.Chainable<SlotRow> {
  const { note, days, hour } = plan;
  return cy.gql<{ venueSlots: SlotRow[] }>(VENUE_SLOTS, { venue: venueId }, { token }).then(({ venueSlots }) => {
    const open = venueSlots.find((slot) => slot.notes === note && slot.status === 'AVAILABLE');
    if (open) return cy.wrap(open, { log: false });
    const start = utcDayAt(days, hour);
    const slot = {
      start_at: start,
      end_at: new Date(Date.parse(start) + 2 * HOUR_MS).toISOString(),
      price: 0,
      capacity: FIXTURE_CAPACITY,
      notes: note,
    };
    return cy
      .gql<{ createVenueSlots: SlotRow[] }>(CREATE_SLOTS, { input: { venue_id: venueId, slots: [slot] } }, { token })
      .then(({ createVenueSlots }) => cy.wrap(createVenueSlots[0], { log: false }));
  });
}

/** A FREE physical pod the run hosts at its own venue, in its own club, titled `title`. */
export function createOwnFreePod(
  token: string,
  world: Omit<FixtureWorld, 'pod'>,
  title: string,
  slot: SlotRow,
): Cypress.Chainable<PodRow> {
  return samplePodImage(token).then((url) =>
    cy
      .gql<{ createPartnerPod: PodRow }>(
        CREATE_POD,
        {
          input: {
            pod_title: title,
            pod_description: marked('free pod description'),
            pod_hosts_id: [world.userId],
            club_id: world.club.id,
            venue_id: world.venue.id,
            venue_slot_id: slot.id,
            pod_mode: 'PHYSICAL',
            pod_type: 'FREE',
            pod_amount: 0,
            no_of_spots: FIXTURE_CAPACITY / 2,
            pod_date_time: slot.start_at,
            pod_images_and_videos: [{ url, type: 'IMAGE' }],
          },
        },
        { token },
      )
      .then(({ createPartnerPod }) => createPartnerPod),
  );
}

/** Venue, host profile, club and the run's FREE physical pod at its own venue — each found, or built now. */
export function ensureFreePod(token: string): Cypress.Chainable<FixtureWorld> {
  const title = marked('free pod');
  return ensurePartner(token).then((parts) =>
    cy.gql<{ myHostPods: PodRow[] }>(MY_HOST_PODS, {}, { token }).then(({ myHostPods }) => {
      const found = named(myHostPods, title, (row) => row.pod_title);
      const plan = { note: marked('free pod slot'), days: POD_SLOT_DAY, hour: 10 };
      const pod = found
        ? cy.wrap(found, { log: false })
        : ensureOpenSlot(token, parts.venue.id, plan).then((slot) => createOwnFreePod(token, parts, title, slot));
      return pod.then((row) => ({
        ...parts,
        pod: { id: row.id, title, venueId: row.venue_id ?? '', slotId: row.venue_slot_id ?? '', clubId: row.club_id },
      }));
    }),
  );
}

/** The run's partner records without the pod: its user id, venue, host profile and club. */
export function ensurePartner(token: string): Cypress.Chainable<Omit<FixtureWorld, 'pod'>> {
  let userId = '';
  let venue: FixtureVenue | null = null;
  let host: FixtureHost | null = null;
  let club: FixtureClub | null = null;
  memberId(token).then((id) => {
    userId = id;
  });
  ensureVenue(token).then((found) => {
    venue = found;
  });
  ensureHost(token).then((found) => {
    host = found;
  });
  ensureClub(token).then((found) => {
    club = found;
  });
  return cy.then(() => {
    if (!venue || !host || !club) {
      throw new Error('The fixture world could not be built: see the step that failed above.');
    }
    return { userId, venue, host, club };
  });
}
