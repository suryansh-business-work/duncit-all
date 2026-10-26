/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer } from '../../../support/api-apps';

/**
 * Duncit Coins — the balance and the ledger are the caller's own, and a member
 * who has earned nothing holds nothing. Scenario map: Apps › Duncit Coins
 * ("View coin balance and history", "Redeem coins at product checkout" — the
 * "no coins to redeem yet" state).
 *
 * Coins are only ever written by a payment, a referral, a gift card, a pod
 * rating, an admin adjustment or the expiry sweep (coin.model.ts
 * CoinTxnSource). The run account has paid for nothing, linked no referral,
 * redeemed no gift card, rated no pod, and signup grants none — so its balance
 * and its ledger are empty, not merely small.
 */

const BALANCE = `query E2eCoinBalance { myCoinBalance { balance lifetime_earned } }`;
const LEDGER = `query E2eCoinLedger { myCoinTransactions { id } }`;

describe('API · A member who has earned nothing holds no Duncit Coins', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('DC-01 the balance and the ledger are refused to a signed-out caller', () => {
    cy.gqlRaw(BALANCE, {}, { token: null }).then((body) => expectRefused('myCoinBalance', body, SIGNED_OUT));
    cy.gqlRaw(LEDGER, {}, { token: null }).then((body) => expectRefused('myCoinTransactions', body, SIGNED_OUT));
  });

  it('DC-02 a new member has a zero balance and has never earned a coin', () => {
    cy.gqlRaw(BALANCE, {}, { token: memberToken }).then((body) =>
      expectAnswer('myCoinBalance', body, { balance: 0, lifetime_earned: 0 }),
    );
  });

  it('DC-03 a new member has no coin history', () => {
    cy.gqlRaw(LEDGER, {}, { token: memberToken }).then((body) => expectAnswer('myCoinTransactions', body, []));
  });
});
