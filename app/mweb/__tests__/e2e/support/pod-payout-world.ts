/// <reference types="cypress" />
import { runAddress } from '@duncit/utils';
import { ideaCategoryPath, type CategoryPath } from './pod-ideas-steps';
import type { RunAccount } from './run-account';

/**
 * The people and places the pod payout journey (specs/10-pod-payout.cy.ts)
 * happens between, made through the real API by an operator before the first
 * screen is opened.
 *
 * Nothing on the server is touched that a staff member could not do from a
 * portal: the operator is a SUPER_ADMIN signing in with a password, and every
 * record is made with the mutation its own console uses. Each account's
 * address is the run address with a suffix (`…-pod-host@…`), which is what lets
 * the purge find them, their venue and its slots afterwards, and what lets the
 * OTP testing API hold their email-verification codes.
 *
 * The category path and the city are the server's own — the first active ones
 * it has — so a run leaves no category or city behind.
 */

const SETTINGS_QUERY = `query E2ePayoutSettings {
  e2eRunSettings { otp_bypass mute_communications }
  publicFinanceSettings { dummy_mode razorpay_enabled }
}`;

const LOCATIONS_QUERY = `query E2ePayoutLocations {
  locations(filter: { is_active: true }) {
    id location_name city state location_pincode location_zones { zone_name }
  }
}`;

const SUB_CATEGORY_QUERY = `query E2ePayoutSubCategory($id: ID!) {
  category(category_id: $id) { id min_pax }
}`;

const CREATE_USER_MUTATION = `mutation E2ePayoutCreateUser($input: CreateUserInput!) {
  createUser(input: $input) { user_id }
}`;

const CREATE_HOST_MUTATION = `mutation E2ePayoutCreateHost(
  $user: ID!, $step1: HostStep1Input!, $step2: HostStep2Input!, $step3: HostStep3Input!
) {
  adminCreateHost(target_user_id: $user, step1: $step1, step2: $step2, step3: $step3, submit: true) { id }
}`;

const APPROVE_HOST_MUTATION = `mutation E2ePayoutApproveHost(
  $id: ID!, $step1: HostStep1Input!, $step2: HostStep2Input!, $step3: HostStep3Input!, $categories: [HostCategoryInput!]
) {
  adminUpdateHost(host_doc_id: $id, step1: $step1, step2: $step2, step3: $step3, status: APPROVED, categories: $categories) {
    id status
  }
}`;

const CREATE_VENUE_MUTATION = `mutation E2ePayoutCreateVenue(
  $owner: ID!, $step1: VenueStep1Input!, $step2: VenueStep2Input!, $step3: VenueStep3Input!
) {
  adminCreateVenue(owner_user_id: $owner, step1: $step1, step2: $step2, step3: $step3, submit: true) { id }
}`;

const APPROVE_VENUE_MUTATION = `mutation E2ePayoutApproveVenue(
  $id: ID!, $step1: VenueStep1Input!, $step2: VenueStep2Input!, $step3: VenueStep3Input!
) {
  adminUpdateVenue(venue_doc_id: $id, step1: $step1, step2: $step2, step3: $step3, status: APPROVED) { id status }
}`;

const CREATE_CLUB_MUTATION = `mutation E2ePayoutCreateClub($input: CreateClubInput!) {
  createClub(input: $input) { id club_id }
}`;

const CREATE_SLOT_MUTATION = `mutation E2ePayoutCreateSlot($input: BulkCreateVenueSlotsInput!) {
  adminCreateVenueSlots(input: $input) { id start_at end_at price }
}`;

const SELECT_LOCATION_MUTATION = `mutation E2ePayoutSelectLocation($location: ID, $zone: String) {
  setMySelectedLocation(location_id: $location, zone_name: $zone) { user_id }
}`;

const REQUEST_EMAIL_CODE_MUTATION = `mutation E2ePayoutRequestEmailCode {
  requestEmailVerificationOtp { ok }
}`;

const VERIFY_EMAIL_MUTATION = `mutation E2ePayoutVerifyEmail($otp: String!) {
  verifyEmailVerificationOtp(otp: $otp) { user_id }
}`;

const RETIRE_CLUB_MUTATION = `mutation E2ePayoutRetireClub($id: ID!) {
  updateClub(club_doc_id: $id, input: { is_active: false }) { id }
}`;

/** The one space the venue has, and the slot is cut for. */
export const SPACE_LABEL = 'Main Hall';
/** What the venue asks for the slot, in rupees. */
export const SLOT_PRICE = 400;
/** The GST-inclusive ticket price the host sets, in rupees. */
export const TICKET_PRICE = 300;
/** How long the slot is: the shortest pod the Create Pod stepper lets a host schedule. */
const POD_MINUTES = 30;
/** The fewest spots the journey needs: four guests and the host's own seat, with one to spare. */
const MIN_SPOTS = 6;

const DIAL_CODE = '+91';
const DATE_OF_BIRTH = '1995-01-15';
/** Stands in for the KYC documents an admin attaches on a partner's behalf; never opened by the journey. */
const PLACEHOLDER_DOCUMENT = 'https://example.com/e2e-placeholder-document.pdf';
const PLACEHOLDER_ID_NUMBER = 'E2E-NOT-A-REAL-ID';

export interface Actor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface PayoutWorld {
  operatorToken: string;
  path: CategoryPath;
  location: { id: string; name: string; city: string; state: string; pincode: string; zone: string };
  host: Actor;
  venueOwner: Actor;
  clubAdmin: Actor;
  finance: Actor;
  attendees: Actor[];
  club: { id: string; name: string };
  venue: { id: string; name: string; capacity: number };
  slot: { id: string; startAt: string; endAt: string };
}

interface ActorSeed {
  key: string;
  suffix: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

const ACTOR_SEEDS: readonly ActorSeed[] = [
  { key: 'host', suffix: 'pod-host', firstName: 'Harsh', lastName: 'Host', roles: ['USER', 'HOST'] },
  { key: 'venueOwner', suffix: 'pod-venue', firstName: 'Vani', lastName: 'Venue', roles: ['USER'] },
  { key: 'clubAdmin', suffix: 'pod-club', firstName: 'Chetan', lastName: 'Clubadmin', roles: ['USER'] },
  { key: 'finance', suffix: 'pod-finance', firstName: 'Farah', lastName: 'Finance', roles: ['USER', 'FINANCE_MANAGER'] },
  { key: 'guest1', suffix: 'pod-guest-1', firstName: 'Asha', lastName: 'Guest', roles: ['USER'] },
  { key: 'guest2', suffix: 'pod-guest-2', firstName: 'Bharat', lastName: 'Guest', roles: ['USER'] },
  { key: 'guest3', suffix: 'pod-guest-3', firstName: 'Chitra', lastName: 'Guest', roles: ['USER'] },
  { key: 'guest4', suffix: 'pod-guest-4', firstName: 'Dev', lastName: 'Guest', roles: ['USER'] },
];

const GUEST_KEYS = ['guest1', 'guest2', 'guest3', 'guest4'] as const;

interface LocationRow {
  id: string;
  location_name: string;
  city: string;
  state: string;
  location_pincode: string;
  location_zones: Array<{ zone_name: string }>;
}

const envText = (name: string): string => String(Cypress.env(name) ?? '').trim();

/** The operator's sign-in, or a failure that says what to set. */
function operatorCredentials(): { email: string; password: string } {
  const email = envText('E2E_OPERATOR_EMAIL');
  const password = envText('E2E_OPERATOR_PASSWORD');
  if (!email || !password) {
    throw new Error(
      'CYPRESS_E2E_OPERATOR_EMAIL and CYPRESS_E2E_OPERATOR_PASSWORD are not set. The pod payout journey needs a ' +
        'SUPER_ADMIN on the server under test to create its host, venue, club and guests.',
    );
  }
  return { email, password };
}

/** Minutes between making the slot and the pod starting — the time the bookings have. */
export function podLeadMinutes(): number {
  const minutes = Number(envText('E2E_POD_LEAD_MINUTES') || '10');
  if (!Number.isFinite(minutes) || minutes < 3) {
    throw new Error('CYPRESS_E2E_POD_LEAD_MINUTES must be a number of minutes, 3 or more.');
  }
  return minutes;
}

/**
 * A number nobody else on the server has: one account may hold one number, and
 * the stamp is unique to the run. Nothing is ever sent to it — the setup
 * refuses to start unless the server is holding its messages.
 */
const actorPhone = (stamp: string, index: number): string => `6${index}${stamp.slice(0, 4)}${stamp.slice(8, 12)}`;

function assertServerIsATestTarget(): void {
  cy.gql<{
    e2eRunSettings: { otp_bypass: boolean; mute_communications: boolean };
    publicFinanceSettings: { dummy_mode: boolean; razorpay_enabled: boolean };
  }>(SETTINGS_QUERY).then((data) => {
    if (!data.e2eRunSettings.otp_bypass || !data.e2eRunSettings.mute_communications) {
      throw new Error(
        'Staging prerequisite: "Hold communications" and "One-time codes for the run account" must both be ON ' +
          '(Tech > E2E Tests > Settings), so no message reaches a real person and the guests can verify their email.',
      );
    }
    if (!data.publicFinanceSettings.dummy_mode || data.publicFinanceSettings.razorpay_enabled) {
      throw new Error(
        'Staging prerequisite: Finance > Settings must have dummy mode ON and Razorpay OFF, so a guest can pay ' +
          'for a seat without a real gateway.',
      );
    }
  });
}

function firstCityWithALocality(): Cypress.Chainable<PayoutWorld['location']> {
  return cy.gql<{ locations: LocationRow[] }>(LOCATIONS_QUERY).then((data) => {
    const city = data.locations.find((row) => row.location_zones.length > 0);
    if (!city) {
      throw new Error(
        'Staging prerequisite: no active city has a locality (Admin > Locations), so no club or venue can be placed.',
      );
    }
    return cy.wrap(
      {
        id: city.id,
        name: city.location_name,
        city: city.city,
        state: city.state,
        pincode: city.location_pincode,
        zone: city.location_zones[0].zone_name,
      },
      { log: false },
    );
  });
}

function createActors(account: RunAccount, cityName: string, actors: Record<string, Actor>): void {
  ACTOR_SEEDS.forEach((seed, index) => {
    const email = runAddress(account.email, seed.suffix);
    const phone = actorPhone(account.stamp, index);
    cy.gql<{ createUser: { user_id: string } }>(CREATE_USER_MUTATION, {
      input: {
        first_name: seed.firstName,
        last_name: seed.lastName,
        email,
        phone_number: phone,
        phone_extension: DIAL_CODE,
        password: account.password('SIGNUP'),
        dob: DATE_OF_BIRTH,
        roles: seed.roles,
        city: cityName,
      },
    }).then((data) => {
      actors[seed.key] = { id: data.createUser.user_id, email, firstName: seed.firstName, lastName: seed.lastName, phone };
    });
  });
}

const fullName = (actor: Readonly<Actor>): string => `${actor.firstName} ${actor.lastName}`;

/** An approved host profile carrying the one category the club is filed under. */
function approveAsHost(host: Readonly<Actor>, path: Readonly<CategoryPath>, address: string): void {
  const steps = {
    step1: { full_name: fullName(host), email: host.email, phone: `${DIAL_CODE}${host.phone}`, dob: DATE_OF_BIRTH },
    step2: { aadhar_number: PLACEHOLDER_ID_NUMBER, pan_number: PLACEHOLDER_ID_NUMBER, passport_photo_url: PLACEHOLDER_DOCUMENT },
    step3: { police_verification_url: PLACEHOLDER_DOCUMENT, full_address: address },
  };
  cy.gql<{ adminCreateHost: { id: string } }>(CREATE_HOST_MUTATION, { user: host.id, ...steps }).then((created) => {
    cy.gql<{ adminUpdateHost: { status: string } }>(APPROVE_HOST_MUTATION, {
      id: created.adminCreateHost.id,
      ...steps,
      categories: [
        { super_category_id: path.superCategory.id, category_id: path.category.id, sub_category_id: path.sub.id },
      ],
    }).then((approved) => {
      expect(approved.adminUpdateHost.status, 'host profile status').to.eq('APPROVED');
    });
  });
}

/** An approved venue in the club's locality and category, owned by someone who is not the host. */
function createVenue(
  owner: Readonly<Actor>,
  name: string,
  capacity: number,
  path: Readonly<CategoryPath>,
  location: Readonly<PayoutWorld['location']>,
): Cypress.Chainable<string> {
  const steps = {
    step1: {
      venue_name: name,
      venue_type: 'Studio',
      capacity,
      capacity_items: [{ label: SPACE_LABEL, capacity }],
      venue_category: {
        super_category_id: path.superCategory.id,
        category_id: path.category.id,
        sub_category_id: path.sub.id,
      },
      location_id: location.id,
      address_line1: `${name}, ${location.zone}`,
      city: location.city,
      state: location.state,
      locality: location.zone,
      postal_code: location.pincode,
    },
    step2: { documents: [] },
    step3: { owner_name: fullName(owner), owner_email: owner.email, owner_phone: `${DIAL_CODE}${owner.phone}` },
  };
  return cy
    .gql<{ adminCreateVenue: { id: string } }>(CREATE_VENUE_MUTATION, { owner: owner.id, ...steps })
    .then((created) =>
      cy
        .gql<{ adminUpdateVenue: { status: string } }>(APPROVE_VENUE_MUTATION, { id: created.adminCreateVenue.id, ...steps })
        .then((approved) => {
          expect(approved.adminUpdateVenue.status, 'venue status').to.eq('APPROVED');
          return cy.wrap(created.adminCreateVenue.id, { log: false });
        }),
    );
}

/** A guest may only pay with a verified email, and proves it with the code the server holds for the run. */
function verifyGuestEmail(account: RunAccount, guest: Readonly<Actor>): void {
  cy.apiLogin(guest.email, account.password('SIGNUP'));
  cy.lastOtpIssuedAt('EMAIL_VERIFICATION', { email: guest.email }).then((before) => {
    cy.gql(REQUEST_EMAIL_CODE_MUTATION);
    cy.readOtp('EMAIL_VERIFICATION', { email: guest.email }, before).then((code) => {
      cy.gql(VERIFY_EMAIL_MUTATION, { otp: code });
    });
  });
}

/**
 * Make everything the journey needs and yield it. The slot is cut last, so the
 * pod's start — `podLeadMinutes()` from now — is as far ahead of the first
 * screen as it can be.
 */
export function buildPayoutWorld(account: RunAccount): Cypress.Chainable<PayoutWorld> {
  const operator = operatorCredentials();
  const actors: Record<string, Actor> = {};
  const made = { operatorToken: '', clubId: '', venueId: '', capacity: MIN_SPOTS, slotId: '', startAt: '', endAt: '' };
  const clubName = `E2E ${account.stamp} Payout Club`;
  const venueName = `E2E ${account.stamp} Payout Studio`;
  let path: CategoryPath;
  let location: PayoutWorld['location'];

  cy.apiLogin(operator.email, operator.password).then((token) => {
    made.operatorToken = token;
  });
  assertServerIsATestTarget();
  ideaCategoryPath().then((found) => {
    path = found;
    cy.gql<{ category: { min_pax: number | null } | null }>(SUB_CATEGORY_QUERY, { id: found.sub.id }).then((data) => {
      made.capacity = Math.max(MIN_SPOTS, data.category?.min_pax ?? 0);
    });
  });
  firstCityWithALocality().then((found) => {
    location = found;
    createActors(account, found.name, actors);
  });

  cy.then(() => {
    approveAsHost(actors.host, path, `${venueName}, ${location.zone}, ${location.city}`);
    createVenue(actors.venueOwner, venueName, made.capacity, path, location).then((venueId) => {
      made.venueId = venueId;
    });
    cy.gql<{ createClub: { id: string } }>(CREATE_CLUB_MUTATION, {
      input: {
        club_name: clubName,
        club_description: 'Made by the pod payout end-to-end journey; safe to remove.',
        location_id: location.id,
        locality: location.zone,
        super_category_id: path.superCategory.id,
        category_id: path.sub.id,
        admin_user_ids: [actors.clubAdmin.id],
        is_active: true,
      },
    }).then((data) => {
      made.clubId = data.createClub.id;
    });
  });

  cy.then(() => {
    for (const key of GUEST_KEYS) verifyGuestEmail(account, actors[key]);
    cy.apiLogin(actors.host.email, account.password('SIGNUP'));
    cy.gql(SELECT_LOCATION_MUTATION, { location: location.id, zone: location.zone });
  });

  cy.then(() => {
    const start = Date.now() + podLeadMinutes() * 60_000;
    cy.gql<{ adminCreateVenueSlots: Array<{ id: string; start_at: string; end_at: string }> }>(
      CREATE_SLOT_MUTATION,
      {
        input: {
          venue_id: made.venueId,
          slots: [
            {
              start_at: new Date(start).toISOString(),
              end_at: new Date(start + POD_MINUTES * 60_000).toISOString(),
              price: SLOT_PRICE,
              space_label: SPACE_LABEL,
              capacity: made.capacity,
            },
          ],
        },
      },
      { token: made.operatorToken },
    ).then((data) => {
      const [slot] = data.adminCreateVenueSlots;
      made.slotId = slot.id;
      made.startAt = slot.start_at;
      made.endAt = slot.end_at;
    });
  });

  return cy.then(() =>
    cy.wrap<PayoutWorld>(
      {
        operatorToken: made.operatorToken,
        path,
        location,
        host: actors.host,
        venueOwner: actors.venueOwner,
        clubAdmin: actors.clubAdmin,
        finance: actors.finance,
        attendees: GUEST_KEYS.map((key) => actors[key]),
        club: { id: made.clubId, name: clubName },
        venue: { id: made.venueId, name: venueName, capacity: made.capacity },
        slot: { id: made.slotId, startAt: made.startAt, endAt: made.endAt },
      },
      { log: false },
    ),
  );
}

/**
 * Take the run's club out of every list. Its pod, payments and payouts stay —
 * they are the server's financial record of the run — and the accounts, the
 * venue and its slots go with the purge.
 */
export function retirePayoutWorld(world: Readonly<PayoutWorld>): void {
  cy.gql(RETIRE_CLUB_MUTATION, { id: world.club.id }, { token: world.operatorToken });
}
