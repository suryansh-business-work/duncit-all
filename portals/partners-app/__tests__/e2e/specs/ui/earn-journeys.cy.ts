/// <reference types="cypress" />
import { partnerWorld, publicFlag, signInRunPartner, stubWindowOpen, visitAndWait } from '../../support/ui-partners-3';

/**
 * Earn / onboarding journeys, live (scenario map › Partners › Earn /
 * onboarding journeys), as the partner the fixture step made: a HOST, a
 * VENUE_OWNER and a CLUB_ADMIN, with no E-Commerce Brand role and no
 * onboarding meeting.
 *
 * /earn, /be-a-host and /become-a-brand-partner (src/pages/earn-page/EarnPage.tsx)
 * render @duncit/earn's cards from EARN_JOURNEYS (@duncit/onboarding
 * journeys.ts) locked by `earnBoxState` (state.ts): a held role reads
 * "Already enabled" with its next-step button. A journey's survey and the
 * host's next step open on mWeb in a new tab (`window.open`, stubbed here so
 * nothing leaves the portal); the other next steps are this portal's routes.
 * The product-seller journey follows the `is_product_visible` flag. Nothing is
 * booked or written.
 */

/** `ALREADY_ENABLED_LABEL` (@duncit/onboarding state.ts). */
const ALREADY_ENABLED = 'Already enabled';

/** The four journeys as EARN_JOURNEYS defines them. */
const JOURNEY = {
  HOST: { title: 'By hosting a pod', cta: 'Ready to host more experiences?' },
  VENUE_OWNER: { title: 'By registering your venue', cta: 'Ready to register another venue?' },
  ECOMM_MANAGER: { title: 'By listing your product', survey: '/survey/ecomm' },
  CLUB_ADMIN: { title: 'By managing a club', cta: 'Manage your clubs' },
} as const;

const EARN_ME = `query E2eUiP3EarnMe { me { roles } myMeetings { kind status } }`;

/** `card` reads Already enabled and offers `cta`. */
function expectHeld(role: 'HOST' | 'VENUE_OWNER' | 'CLUB_ADMIN'): void {
  cy.byTestId(`earn-box-${role}-title`).should('have.text', JOURNEY[role].title);
  cy.byTestId(`earn-box-${role}-enabled`).should('have.text', ALREADY_ENABLED);
  cy.byTestId(`earn-box-${role}-open`).should('be.disabled');
  cy.byTestId(`earn-box-${role}-cta`).should('have.text', JOURNEY[role].cta);
}

describe('Partners · Earn / onboarding journeys (a HOST, VENUE_OWNER and CLUB_ADMIN)', () => {
  let productsOn = false;

  before(() => {
    signInRunPartner();
    partnerWorld();
    cy.gql<{ me: { roles: string[] }; myMeetings: Array<{ kind: string; status: string }> }>(EARN_ME).then((data) => {
      if (data.me.roles.includes('ECOMM_MANAGER')) {
        throw new Error('The run account holds ECOMM_MANAGER: a spec that granted it did not revoke it.');
      }
      const ecomm = data.myMeetings.find((meeting) => meeting.kind === 'ECOMM');
      if (ecomm) throw new Error(`The run account has an ECOMM onboarding meeting (${ecomm.status}); its card would be locked.`);
    });
    publicFlag('is_product_visible').then((on) => {
      productsOn = on;
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('EJ-01 /earn: each held role reads Already enabled with its next step, and the next steps go where they say', () => {
    visitAndWait('/earn', 'EarnMe');
    cy.byTestId('earn-page-title').should('have.text', 'Earn with Duncit');
    expectHeld('HOST');
    expectHeld('VENUE_OWNER');
    expectHeld('CLUB_ADMIN');
    stubWindowOpen();
    cy.byTestId('earn-box-HOST-cta').click();
    cy.get('@windowOpen').should('have.been.calledOnce');
    cy.get('@windowOpen').its('firstCall.args.0').should('match', /\/host\/manage$/);
    cy.byTestId('earn-box-VENUE_OWNER-cta').click();
    cy.location('pathname').should('eq', '/register-venue/new');
    cy.go('back');
    cy.byTestId('earn-box-CLUB_ADMIN-cta').click();
    cy.location('pathname').should('eq', '/club-admin/dashboard');
  });

  it('EJ-02 /earn with the product flag on: the product journey is open and its card opens the mWeb survey', function () {
    if (!productsOn) this.skip();
    visitAndWait('/earn', 'EarnMe');
    cy.byTestId('earn-box-ECOMM_MANAGER-title').should('have.text', JOURNEY.ECOMM_MANAGER.title);
    cy.byTestId('earn-box-ECOMM_MANAGER-enabled').should('not.exist');
    stubWindowOpen();
    cy.byTestId('earn-box-ECOMM_MANAGER-open').should('be.enabled').click();
    cy.get('@windowOpen').its('firstCall.args.0').should('match', new RegExp(`${JOURNEY.ECOMM_MANAGER.survey}$`));
  });

  it('EJ-03 /earn with the product flag off: the product journey is not offered', function () {
    if (productsOn) this.skip();
    visitAndWait('/earn', 'EarnMe');
    cy.byTestId('earn-box-HOST').should('exist');
    cy.byTestId('earn-box-ECOMM_MANAGER').should('not.exist');
  });

  it('EJ-04 Be a Host opens the host journey alone, and See all the ways goes back to every journey', () => {
    visitAndWait('/be-a-host', 'EarnMe');
    cy.byTestId('earn-page-title').should('have.text', 'Be a Host');
    expectHeld('HOST');
    cy.byTestId('earn-box-VENUE_OWNER').should('not.exist');
    cy.byTestId('earn-box-CLUB_ADMIN').should('not.exist');
    cy.byTestId('earn-see-all').should('have.text', 'See all the ways to earn with Duncit').click();
    cy.location('pathname').should('eq', '/earn');
    cy.byTestId('earn-box-VENUE_OWNER').should('exist');
    cy.byTestId('earn-box-CLUB_ADMIN').should('exist');
  });

  it('EJ-05 Become an E-Commerce Brand Partner opens the product journey alone (or no card while the flag is off)', () => {
    visitAndWait('/become-a-brand-partner', 'EarnMe');
    cy.byTestId('earn-page-title').should('have.text', 'Become an E-Commerce Brand Partner');
    cy.byTestId('earn-box-HOST').should('not.exist');
    cy.byTestId('earn-see-all').should('have.text', 'See all the ways to earn with Duncit');
    if (productsOn) {
      stubWindowOpen();
      cy.byTestId('earn-box-ECOMM_MANAGER-open').should('be.enabled').click();
      cy.get('@windowOpen').its('firstCall.args.0').should('match', new RegExp(`${JOURNEY.ECOMM_MANAGER.survey}$`));
    } else {
      cy.byTestId('earn-box-ECOMM_MANAGER').should('not.exist');
    }
  });
});
