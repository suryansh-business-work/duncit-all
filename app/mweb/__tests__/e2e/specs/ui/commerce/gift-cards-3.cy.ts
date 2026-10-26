/// <reference types="cypress" />
import { openSignedOut } from '../../../support/account-steps';
import { runAccount } from '../../../support/run-account';
import { declineTracking, expectSignInFor, signInFromHere } from '../../../support/ui-apps-3';

/**
 * Gift cards — redeeming a code and a shared link, live (scenario map › Gift
 * cards, third part).
 *
 * /gift-cards/redeem looks a code up with `giftCardByCode`; a code no card
 * has is refused by the server ("Gift card not found") and the page says it
 * could not be redeemed. A shared link (/gift-card/:code) is a signed-in page:
 * opened signed out it parks on sign-in with the link kept, and opens straight
 * after. No card is bought or redeemed — the code used here is checked first
 * to belong to no card.
 */

/** Sixteen characters, the server's code length; no card is minted from Z alone. */
const UNKNOWN_CODE = 'ZZZZ-ZZZZ-ZZZZ-ZZZZ';
const LOOKUP = `query E2eUi3GiftCard($code: String!) { giftCardByCode(code: $code) { id } }`;
const REDEEM_ERROR = 'This code could not be redeemed. Check it and try again.';

describe('Gift cards (redeem and claim links)', () => {
  const account = runAccount();

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    cy.gqlRaw(LOOKUP, { code: UNKNOWN_CODE }).then((body) => {
      expect(body.errors?.[0]?.extensions?.code, `${UNKNOWN_CODE} belongs to no card`).to.equal('NOT_FOUND');
    });
  });

  beforeEach(() => {
    declineTracking();
  });

  it('GC-01 Check card stays shut until a code is typed, and the hint shows the code’s shape', () => {
    cy.visitApp('/gift-cards/redeem');
    cy.byTestId('gift-card-redeem-header-title').should('have.text', 'Redeem a gift card');
    cy.byTestId('gift-card-check').should('be.disabled');
    cy.byTestId('gift-card-code').should('contain.text', 'Looks like XXXX-XXXX-XXXX-XXXX');
    cy.byTestId('gift-card-code-input').type('   ');
    cy.byTestId('gift-card-check').should('be.disabled');
  });

  it('GC-02 a code no card has is refused with a message, and no redeem button is offered', () => {
    cy.visitApp('/gift-cards/redeem');
    cy.byTestId('gift-card-code-input').type(UNKNOWN_CODE);
    cy.interceptOperation('GiftCardByCode');
    cy.byTestId('gift-card-check').should('be.enabled').click();
    cy.wait('@GiftCardByCode');
    cy.byTestId('gift-card-lookup-error').should('have.text', REDEEM_ERROR);
    cy.byTestId('gift-card-redeem-panel').should('not.exist');
    cy.byTestId('gift-card-redeem-cta').should('not.exist');
  });

  it('GC-03 a shared link opened signed out asks to sign in, then opens the link', () => {
    const link = `/gift-card/${UNKNOWN_CODE}`;
    openSignedOut(link);
    expectSignInFor(link);
    signInFromHere();
    cy.location('pathname').should('eq', link);
    cy.byTestId('gift-card-claim-screen').should('be.visible');
    cy.byTestId('gift-card-claim-error').should('have.text', REDEEM_ERROR);
  });
});
