/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { runAccount } from '../../../support/run-account';

/**
 * Gift cards (UI), the scenario map's second-third rows, live on staging.
 * Nothing is bought: the Buy tab's validation is walked up to an enabled
 * "Continue to payment" and left there, and My cards is checked empty for the
 * run account, which has never bought or received a card. The amount limits
 * are Finance > Gift Cards' own, read from `publicGiftCardSettings`.
 */

const SETTINGS = `query E2eUiGiftCardSettings { publicGiftCardSettings { denominations min_amount max_amount } }`;
const MY_CARDS = `query E2eUiMyGiftCards { myGiftCards { owned { id } gifted { id } } }`;

interface Settings {
  denominations: number[];
  min_amount: number;
  max_amount: number;
}

const amountInput = () => cy.byTestId('gift-card-custom-amount-input');
const continueButton = () => cy.byTestId('gift-card-continue');

function fill(testId: string, text: string): void {
  cy.byTestId(testId).clear();
  cy.byTestId(testId).type(text);
}

describe('Gift cards', { testIsolation: false }, () => {
  const account = runAccount();
  let settings: Settings;

  before(() => {
    signInRunMember();
    cy.gql<{ publicGiftCardSettings: Settings }>(SETTINGS).then(({ publicGiftCardSettings }) => {
      settings = publicGiftCardSettings;
    });
  });

  it('GC-01 Continue stays disabled until the amount is in range and, for a gift, the email is valid', () => {
    cy.interceptOperation('PublicGiftCardSettings');
    cy.visitApp('/gift-cards');
    cy.wait('@PublicGiftCardSettings');
    cy.byTestId('gift-cards-tab-buy').should('have.attr', 'aria-selected', 'true');
    continueButton().should('have.text', 'Continue to payment').and('be.disabled');

    fill('gift-card-custom-amount-input', String(settings.max_amount + 1));
    amountInput().should('have.attr', 'aria-invalid', 'true');
    continueButton().should('be.disabled');
    if (settings.min_amount > 1) {
      fill('gift-card-custom-amount-input', String(settings.min_amount - 1));
      amountInput().should('have.attr', 'aria-invalid', 'true');
      continueButton().should('be.disabled');
    }
    fill('gift-card-custom-amount-input', String(settings.min_amount));
    amountInput().should('have.attr', 'aria-invalid', 'false');
    continueButton().should('be.enabled');

    const [denomination] = settings.denominations;
    if (denomination !== undefined) {
      cy.byTestId(`gift-card-amount-${denomination}`).click();
      cy.byTestId(`gift-card-amount-${denomination}`).should('have.attr', 'aria-pressed', 'true');
      amountInput().should('have.value', String(denomination));
    }

    cy.byTestId('gift-card-for-someone').click();
    continueButton().should('be.disabled');
    fill('gift-card-recipient-email-input', 'not-an-email');
    cy.byTestId('gift-card-recipient-email-input').should('have.attr', 'aria-invalid', 'true');
    continueButton().should('be.disabled');
    fill('gift-card-recipient-email-input', account.address('gift'));
    cy.byTestId('gift-card-recipient-email-input').should('have.attr', 'aria-invalid', 'false');
    continueButton().should('be.enabled');

    cy.byTestId('gift-card-for-myself').click();
    cy.byTestId('gift-card-recipient-email-input').should('not.exist');
    continueButton().should('be.enabled');
  });

  it('GC-02 My cards is empty for a member who has none, and the tab is kept in the URL', () => {
    cy.gql<{ myGiftCards: { owned: unknown[]; gifted: unknown[] } }>(MY_CARDS).then(({ myGiftCards }) => {
      expect(myGiftCards.owned, 'the run account owns no gift card').to.have.length(0);
      expect(myGiftCards.gifted, 'the run account has gifted no card').to.have.length(0);
    });
    cy.visitApp('/gift-cards');
    cy.interceptOperation('MyGiftCards');
    cy.byTestId('gift-cards-tab-cards').click();
    cy.wait('@MyGiftCards');
    cy.location('search').should('contain', 'selectedtab=mycards');
    cy.byTestId('gift-cards-empty-title').should('have.text', 'No gift cards yet. Buy one, or redeem a code someone sent you.');
  });
});
