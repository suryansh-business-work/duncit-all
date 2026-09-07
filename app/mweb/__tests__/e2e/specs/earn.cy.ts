/// <reference types="cypress" />

import { earnFixtures, earnMeeting } from '../support/data';

/**
 * Earn with Duncit — every state a journey card can be in.
 *
 * The four cards are the whole page, and which one is open is decided by
 * exactly two things: the roles the viewer holds and the onboarding meetings
 * they have. That rule lives in `earnBoxState` (@duncit/onboarding) and is
 * shared by mWeb, native and the Partners portal, so the states asserted here
 * are the states all three surfaces show.
 */

/** The card titles, as EARN_JOURNEYS declares them. */
const HOST = 'By hosting a pod';
const VENUE = 'By registering your venue';
const PRODUCT = 'By listing your product';
const CLUB = 'By managing a club';

/** A card's own <Card>, found from its title — the chip, the CTA and the
 * meeting actions all live inside it, and asserting on the page as a whole
 * would let another card's chip satisfy the assertion. */
const card = (title: string) =>
  cy.contains('.MuiCard-root', title);

describe('Earn with Duncit', () => {
  beforeEach(() => {
    cy.blockThirdParty();
    cy.seedAuth();
  });

  it('offers every journey to a user who holds no partner role', () => {
    cy.mockGraphql(earnFixtures());
    cy.visitApp('/earn');

    cy.contains('Earn with Duncit').should('be.visible');
    for (const title of [HOST, VENUE, PRODUCT, CLUB]) {
      card(title).should('be.visible');
    }
    // Nothing is locked, so no card carries the disabled chip.
    cy.contains('Already enabled').should('not.exist');
    cy.contains('Meeting scheduled').should('not.exist');
  });

  it('opens the survey for the journey that was tapped', () => {
    cy.mockGraphql(earnFixtures());
    cy.visitApp('/earn');

    card(HOST).click();
    cy.location('pathname').should('eq', '/survey/host');
  });

  it('sends each journey to its own survey', () => {
    cy.mockGraphql(earnFixtures());

    cy.visitApp('/earn');
    card(VENUE).click();
    cy.location('pathname').should('eq', '/survey/venue');

    cy.visitApp('/earn');
    card(CLUB).click();
    cy.location('pathname').should('eq', '/survey/club_admin');
  });

  it('hides the product journey when products are switched off', () => {
    cy.mockGraphql(earnFixtures({ productsVisible: false }));
    cy.visitApp('/earn');

    card(HOST).should('be.visible');
    cy.contains(PRODUCT).should('not.exist');
  });

  // A role already held wins over any meeting history, so the card stops being
  // an application and becomes a shortcut to the thing it unlocked.
  it('locks a journey the user already holds and offers its next step', () => {
    cy.mockGraphql(earnFixtures({ roles: ['USER', 'HOST'] }));
    cy.visitApp('/earn');

    card(HOST).within(() => {
      cy.contains('Already enabled').should('be.visible');
    });
    // Wait for the list to stop growing before pressing anything in it.
    // `useFeatureFlag` answers false while it loads, so the product journey is
    // absent on the first render and inserted when the flags land — and the
    // button being clicked is in a card above it, which React re-creates as it
    // reconciles. Its arrival is the signal that this tree is the final one.
    card(PRODUCT).should('be.visible');
    card(HOST)
      .contains('button', 'Ready to host more experiences?')
      .should('be.visible')
      .click();
    cy.location('pathname').should('eq', '/host/manage');
  });

  it('leaves the other journeys open when one role is held', () => {
    cy.mockGraphql(earnFixtures({ roles: ['USER', 'HOST'] }));
    cy.visitApp('/earn');

    card(VENUE).click();
    cy.location('pathname').should('eq', '/survey/venue');
  });

  // A booked meeting blocks re-applying, and says so with the request id — the
  // number a user quotes to support.
  it('blocks a journey with a meeting booked, naming the request', () => {
    cy.mockGraphql(earnFixtures({ meetings: [earnMeeting({ status: 'SCHEDULED' })] }));
    cy.visitApp('/earn');

    card(HOST).within(() => {
      cy.contains('Meeting scheduled').should('be.visible');
      cy.contains('DUN-MTG-000001').should('be.visible');
    });
  });

  it('treats a requested meeting the same as a scheduled one', () => {
    cy.mockGraphql(earnFixtures({ meetings: [earnMeeting({ status: 'REQUESTED' })] }));
    cy.visitApp('/earn');

    card(HOST).within(() => {
      cy.contains('Meeting scheduled').should('be.visible');
    });
  });

  // The meeting is over and an admin has not decided yet: the card stays shut,
  // but for a different reason and with different words.
  it('shows a finished meeting as onboarding in process', () => {
    cy.mockGraphql(
      earnFixtures({ meetings: [earnMeeting({ status: 'DONE', approval_status: 'PENDING' })] }),
    );
    cy.visitApp('/earn');

    card(HOST).within(() => {
      cy.contains('Onboarding in process.').should('be.visible');
      cy.contains('reviewing your application').should('be.visible');
    });
  });

  it('keeps a journey shut while its approved record is still under review', () => {
    cy.mockGraphql(
      earnFixtures({
        meetings: [
          earnMeeting({
            status: 'DONE',
            approval_status: 'APPROVED',
            onboarded_status: 'SUBMITTED',
          }),
        ],
      }),
    );
    cy.visitApp('/earn');

    card(HOST).within(() => {
      cy.contains('Onboarding in process.').should('be.visible');
    });
  });

  // A rejected record is the one DONE meeting that re-opens the journey —
  // otherwise a declined applicant could never apply again.
  it('re-opens a journey once its record is rejected', () => {
    cy.mockGraphql(
      earnFixtures({
        meetings: [
          earnMeeting({
            status: 'DONE',
            approval_status: 'APPROVED',
            onboarded_status: 'REJECTED',
          }),
        ],
      }),
    );
    cy.visitApp('/earn');

    cy.contains('Onboarding in process.').should('not.exist');
    card(HOST).click();
    cy.location('pathname').should('eq', '/survey/host');
  });

  it('blocks only the journey the meeting belongs to', () => {
    cy.mockGraphql(earnFixtures({ meetings: [earnMeeting({ kind: 'VENUE' })] }));
    cy.visitApp('/earn');

    card(VENUE).within(() => {
      cy.contains('Meeting scheduled').should('be.visible');
    });
    card(HOST).click();
    cy.location('pathname').should('eq', '/survey/host');
  });
});
