/// <reference types="cypress" />
import { SPACE_LABEL, TICKET_PRICE, type PayoutWorld } from './pod-payout-world';

/**
 * The venue offer journey's steps (specs/11-venue-offer.cy.ts): the venue's
 * Booking offers settings and the host's offer are made through the API, the
 * bargaining itself happens on the screens — each side answering the other's
 * move from its card in the pod's venue chat.
 */

const SETTINGS_MUTATION = `mutation E2eOfferSettings($venue_doc_id: ID!, $input: VenueSettingsInput!) {
  updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) { id offer_min_guests offer_response_hours }
}`;

const CREATE_POD_MUTATION = `mutation E2eOfferPod($input: CreatePodInput!) {
  createPod(input: $input) { id venue_approval_status is_active }
}`;

const POD_OFFER_QUERY = `query E2ePodVenueOffer($pod_id: ID!) {
  podVenueOffer(pod_id: $pod_id) {
    slot_id status round awaiting model rate min_guests pax offerings note
    quote { venue_payout total }
    quote_min { venue_payout total }
    counter { model rate min_guests note }
  }
}`;

const POD_QUERY = `query E2eOfferPodState($id: ID!) {
  pod(id: $id) { id venue_approval_status is_active }
}`;

/** The fewest guests the venue takes an offer for, and the hours either side has to answer. */
export const VENUE_MIN_GUESTS = 4;
export const RESPONSE_HOURS = 12;
/** The pod's spots — the offer's most guests. */
export const OFFER_SPOTS = 10;
/** The host's opening offer: a minimum order value per person. */
export const OFFER_RATE = 500;
export const OFFERINGS = ['Projector and screen', 'Water for every guest'];
export const OFFER_NOTE = 'Please keep the back room quiet';

export interface PodOffer {
  slot_id: string;
  status: string;
  round: number;
  awaiting: string | null;
  model: string;
  rate: number;
  min_guests: number;
  pax: number;
  offerings: string[];
  note: string;
  quote: { venue_payout: number; total: number };
  quote_min: { venue_payout: number; total: number };
  counter: { model: string; rate: number; min_guests: number; note: string } | null;
}

/** Answer the cookie banner when the page shows it; it covers the bottom of every screen. */
function answerConsent(): void {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="consent-reject-all"]').length > 0) cy.byTestId('consent-reject-all').click();
  });
  cy.byTestId('consent-banner').should('not.exist');
}

/** The venue's own Booking offers settings, saved the way its Venue settings page saves them. */
export function setVenueOfferSettings(world: Readonly<PayoutWorld>): void {
  cy.gql<{ updateVenueSettings: { offer_min_guests: number; offer_response_hours: number } }>(
    SETTINGS_MUTATION,
    { venue_doc_id: world.venue.id, input: { offers: { min_guests: VENUE_MIN_GUESTS, response_hours: RESPONSE_HOURS } } },
    { token: world.operatorToken },
  ).then((data) => {
    expect(data.updateVenueSettings.offer_min_guests, 'venue minimum in effect').to.eq(VENUE_MIN_GUESTS);
    expect(data.updateVenueSettings.offer_response_hours, 'answer window in effect').to.eq(RESPONSE_HOURS);
  });
}

/**
 * A window inside the venue's default opening hours, `daysAhead` days out, at
 * 18:00–20:00 India time — far enough ahead that no minimum notice refuses it.
 */
export function offerWindow(daysAhead: number): { start: string; end: string } {
  const day = new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
  return { start: new Date(`${day}T18:00:00+05:30`).toISOString(), end: new Date(`${day}T20:00:00+05:30`).toISOString() };
}

/** The host's pod, made with its venue offer exactly as Create Pod sends one, by staff on the host's behalf. */
export function placeOfferPod(world: Readonly<PayoutWorld>, title: string, daysAhead: number): Cypress.Chainable<string> {
  const window = offerWindow(daysAhead);
  return cy
    .gql<{ createPod: { id: string; venue_approval_status: string; is_active: boolean } }>(
      CREATE_POD_MUTATION,
      {
        input: {
          pod_title: title,
          pod_description: 'An evening the host and the venue agree on in the venue chat.',
          pod_hosts_id: [world.host.id],
          club_id: world.club.id,
          location_id: world.location.id,
          zone_name: world.location.zone,
          venue_id: world.venue.id,
          pod_mode: 'PHYSICAL',
          pod_type: 'PAID',
          pod_amount: TICKET_PRICE,
          no_of_spots: OFFER_SPOTS,
          pod_date_time: window.start,
          pod_end_date_time: window.end,
          venue_offer: {
            start_at: window.start,
            end_at: window.end,
            space_label: SPACE_LABEL,
            pax: OFFER_SPOTS,
            pets: false,
            model: 'PER_GUEST',
            rate: OFFER_RATE,
            offerings: OFFERINGS,
            note: OFFER_NOTE,
          },
        },
      },
      { token: world.operatorToken },
    )
    .then((data) => {
      expect(data.createPod.venue_approval_status, 'an offer waits for the venue').to.eq('PENDING');
      expect(data.createPod.is_active, 'not live before the venue agrees').to.eq(false);
      return cy.wrap(data.createPod.id, { log: false });
    });
}

/** The pod's live offer as its host or the venue reads it (signed in as one of them). */
export const podOffer = (podId: string): Cypress.Chainable<PodOffer | null> =>
  cy
    .gql<{ podVenueOffer: PodOffer | null }>(POD_OFFER_QUERY, { pod_id: podId })
    .then((data) => cy.wrap<PodOffer | null>(data.podVenueOffer, { log: false }));

export const podLiveState = (podId: string, token: string) =>
  cy.gql<{ pod: { venue_approval_status: string; is_active: boolean } }>(POD_QUERY, { id: podId }, { token }).then((data) => data.pod);

/** The pod's venue chat, as the signed-in member, with its offer card for `round`/`event` on screen. */
export function openVenueChat(podId: string): void {
  cy.interceptOperation('VenueChatRoom');
  cy.visitApp(`/venue-chat/${podId}`);
  cy.wait('@VenueChatRoom');
  cy.byTestId('venue-chat-screen').should('be.visible');
  answerConsent();
}

/** The offer card of one move: `offer-line-<slot>-<round>-<event>`. */
export const offerCard = (slotId: string, round: number, event: string) => cy.byTestId(`offer-line-${slotId}-${round}-${event}`);

/** Fill the counter dialog both sides share and send it; waits for the server's answer. */
export function sendCounter(operation: string, terms: { rate: number; minGuests?: number; note: string }): void {
  cy.get('form [name="rate"]').clear().type(String(terms.rate));
  if (terms.minGuests !== undefined) cy.get('form [name="min_guests"]').clear().type(String(terms.minGuests));
  cy.get('form [name="note"]').clear().type(terms.note);
  cy.interceptOperation(operation);
  cy.byTestId('counter-offer-submit').click();
  cy.wait(`@${operation}`).its('response.body.errors').should('not.exist');
}

/** Confirm the open Accept / Reject dialog; waits for the server's answer. */
export function confirmAnswer(operation: string, reason?: string): void {
  if (reason) cy.get('form [name="reason"]').type(reason);
  cy.interceptOperation(operation);
  cy.byTestId('answer-offer-submit').click();
  cy.wait(`@${operation}`).its('response.body.errors').should('not.exist');
}
