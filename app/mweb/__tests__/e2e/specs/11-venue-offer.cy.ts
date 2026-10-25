/// <reference types="cypress" />
import { E2E_PURGE_MUTATION, runMarker } from '@duncit/utils';
import { buildPayoutWorld, retirePayoutWorld, type Actor, type PayoutWorld } from '../support/pod-payout-world';
import { runAccount } from '../support/run-account';
import {
  OFFERINGS,
  OFFER_NOTE,
  OFFER_RATE,
  OFFER_SPOTS,
  VENUE_MIN_GUESTS,
  confirmAnswer,
  offerCard,
  openVenueChat,
  placeOfferPod,
  podLiveState,
  podOffer,
  sendCounter,
  setVenueOfferSettings,
} from '../support/venue-offer-steps';

/**
 * 11 — A host and a venue bargain over a booking offer in the venue chat, live.
 *
 * The host offers ₹500 a guest for 10 spots at a venue that takes offers for at
 * least 4 guests, listing what they need from it and a note. The venue counters
 * in the chat — a higher rate and a higher minimum — the host counters back,
 * and the venue accepts: the pod goes live on the terms both sides agreed,
 * every move a card in the thread. A second offer the venue declines leaves
 * the host a "Send a new offer" that opens the resubmit form with the declined
 * terms already in it.
 *
 * `before` makes the people and places through the API as an operator
 * (CYPRESS_E2E_OPERATOR_EMAIL / _PASSWORD, a SUPER_ADMIN on the server under
 * test) and gives the venue its Booking offers settings; the pods are made on
 * the host's behalf with the same `venue_offer` Create Pod sends. `after`
 * removes them. The scenarios share the pods and run in order.
 */

interface Journey {
  podId: string;
  slotId: string;
  declinedPodId: string;
  failed: boolean;
}

describe('11 Venue offer', () => {
  const account = runAccount();
  const password = account.password('SIGNUP');
  const title = `${runMarker(account.stamp, 'pod')} Bargained studio night`;
  const declinedTitle = `${runMarker(account.stamp, 'pod')} Declined studio night`;
  const journey: Journey = { podId: '', slotId: '', declinedPodId: '', failed: false };
  let world: PayoutWorld;

  const signInAs = (actor: Readonly<Actor>) => cy.apiLogin(actor.email, password);

  before(() => {
    cy.useRunTraffic();
    buildPayoutWorld(account).then((built) => {
      world = built;
      setVenueOfferSettings(built);
    });
  });

  beforeEach(function () {
    if (journey.failed) this.skip();
  });

  afterEach(function () {
    if (this.currentTest?.state === 'failed') journey.failed = true;
  });

  after(() => {
    if (!world) return;
    retirePayoutWorld(world);
    if (Cypress.env('E2E_KEEP_DATA')) return;
    cy.staffGql(E2E_PURGE_MUTATION, { input: { stamp: account.stamp, signup_email: account.email } });
  });

  it('OFFER-01 the host’s offer reaches the venue, priced from the venue’s minimum up to the pod’s spots', () => {
    placeOfferPod(world, title, 3).then((id) => {
      journey.podId = id;
    });
    signInAs(world.host);
    cy.then(() =>
      podOffer(journey.podId).then((offer) => {
        if (!offer) throw new Error('The pod has no venue offer');
        journey.slotId = offer.slot_id;
        expect(offer).to.include({ status: 'SENT', round: 1, awaiting: 'VENUE', model: 'PER_GUEST', rate: OFFER_RATE });
        expect(offer.min_guests, 'the venue’s own minimum').to.eq(VENUE_MIN_GUESTS);
        expect(offer.pax, 'the pod’s spots').to.eq(OFFER_SPOTS);
        expect(offer.offerings).to.deep.eq(OFFERINGS);
        expect(offer.note).to.eq(OFFER_NOTE);
        expect(offer.quote_min.venue_payout, 'the fewest guests cost less than the most').to.be.lessThan(offer.quote.venue_payout);
      }),
    );
  });

  it('OFFER-02 the venue sees the offer in the chat with what the host needs, and counters', () => {
    signInAs(world.venueOwner);
    openVenueChat(journey.podId);
    cy.byTestId('venue-chat-contact').should('contain.text', world.host.email);
    cy.then(() => {
      offerCard(journey.slotId, 1, 'OFFER').within(() => {
        cy.contains('New booking offer').should('be.visible');
        for (const point of OFFERINGS) cy.contains(point).should('be.visible');
        cy.contains(OFFER_NOTE).should('be.visible');
        cy.byTestId('offer-answer-by').should('be.visible');
        cy.byTestId(`offer-counter-${journey.slotId}`).click();
      });
    });
    sendCounter('CounterVenueOffer', { rate: 600, minGuests: 6, note: 'Weekend rate, snacks included' });
    cy.then(() => offerCard(journey.slotId, 2, 'COUNTER').should('contain.text', 'You countered'));
    podOffer(journey.podId).then((offer) => {
      expect(offer).to.include({ status: 'COUNTERED', round: 2, awaiting: 'HOST' });
      expect(offer?.counter).to.include({ rate: 600, min_guests: 6 });
    });
  });

  it('OFFER-03 the host answers the venue’s counter with one of their own', () => {
    signInAs(world.host);
    openVenueChat(journey.podId);
    cy.byTestId('venue-chat-contact').should('contain.text', world.venueOwner.email);
    cy.then(() => {
      offerCard(journey.slotId, 2, 'COUNTER').within(() => {
        cy.contains('The venue countered').should('be.visible');
        cy.contains('Weekend rate, snacks included').should('be.visible');
        cy.byTestId('host-offer-counter').click();
      });
    });
    sendCounter('CounterVenueOfferAsHost', { rate: 550, note: 'Meet halfway?' });
    cy.then(() => offerCard(journey.slotId, 3, 'COUNTER').should('contain.text', 'You countered'));
    podOffer(journey.podId).then((offer) => {
      expect(offer).to.include({ status: 'SENT', round: 3, awaiting: 'VENUE', rate: 550, min_guests: 6 });
      expect(offer?.counter, 'the venue’s counter was answered').to.eq(null);
    });
  });

  it('OFFER-04 the venue accepts in the chat, and the pod goes live on the agreed terms', () => {
    signInAs(world.venueOwner);
    openVenueChat(journey.podId);
    cy.then(() => {
      offerCard(journey.slotId, 3, 'COUNTER').within(() => {
        cy.contains('The host countered').should('be.visible');
        cy.byTestId(`offer-accept-${journey.slotId}`).click();
      });
    });
    confirmAnswer('AcceptVenueOffer');
    // Accepting closes the round the host's counter opened; only counters start a new one.
    cy.then(() => offerCard(journey.slotId, 3, 'ACCEPTED').should('contain.text', 'booking confirmed'));
    cy.then(() =>
      podLiveState(journey.podId, world.operatorToken).then((pod) => {
        expect(pod.venue_approval_status).to.eq('APPROVED');
        expect(pod.is_active, 'live once both sides agree').to.eq(true);
      }),
    );
    podOffer(journey.podId).then((offer) => {
      expect(offer).to.include({ status: 'ACCEPTED', rate: 550, min_guests: 6, awaiting: null });
    });
  });

  it('OFFER-05 after the venue declines, the host sends a new offer from the declined terms', () => {
    placeOfferPod(world, declinedTitle, 4).then((id) => {
      journey.declinedPodId = id;
    });
    signInAs(world.venueOwner);
    cy.then(() => openVenueChat(journey.declinedPodId));
    podOffer(journey.declinedPodId).then((offer) => {
      if (!offer) throw new Error('The second pod has no venue offer');
      offerCard(offer.slot_id, 1, 'OFFER').within(() => {
        cy.byTestId(`offer-reject-${offer.slot_id}`).click();
      });
      confirmAnswer('RejectVenueOffer', 'Fully booked that evening');
      offerCard(offer.slot_id, 1, 'DECLINED').should('contain.text', 'Fully booked that evening');
    });

    signInAs(world.host);
    cy.then(() => openVenueChat(journey.declinedPodId));
    podOffer(journey.declinedPodId).should('eq', null);
    cy.byTestId('offer-send-new').should('be.visible').click();
    cy.byTestId('pod-resubmit-dialog').should('be.visible');
    cy.byTestId('pod-resubmit-offer-offerings').find('textarea').first().should('contain.value', OFFERINGS[0]);
    cy.byTestId('pod-resubmit-offer-note').find('textarea').first().should('have.value', OFFER_NOTE);
  });
});
