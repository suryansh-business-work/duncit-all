/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, refusal } from '../../../support/api-apps';

/**
 * Wallet — a withdrawal comes only out of the caller's own balance, and a bad
 * request is refused before any debit. Scenario map: Apps › Wallet
 * ("Withdrawal allowed only to partner roles, own wallet").
 *
 * wallet.service.ts requestWithdrawal checks the amount and the payout details
 * first; then the role minimum (assertWithdrawalEligible, skipped when Finance
 * set none) and the guarded debit, which only matches the caller's own wallet
 * holding at least the amount ("Insufficient wallet balance"). The run account
 * has a zero balance, so no request can succeed. A member who holds no partner
 * role is priced as a Host (resolveWithdrawerRole's fallback) — there is no
 * separate role refusal.
 */

const WALLET = `query E2eMyWallet { myWallet { balance currency_symbol withdrawer_role min_withdrawal_amount } }`;
const WITHDRAW = `mutation E2eWithdraw($input: RequestWithdrawalInput!) { requestWithdrawal(input: $input) { id } }`;
const WITHDRAWALS = `query E2eMyWithdrawalsAfter { myWithdrawals { id } }`;

interface Wallet {
  balance: number;
  currency_symbol: string;
  withdrawer_role: string;
  min_withdrawal_amount: number;
}

const UPI = { payout_method: 'UPI', upi_id: 'e2e-run@upi' };

describe('API · A withdrawal only ever draws on the caller’s own balance', { testIsolation: false }, () => {
  let memberToken = '';
  let wallet: Wallet;

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('WL-01 a new member’s wallet is empty and withdraws as a Host', () => {
    cy.gqlRaw(WALLET, {}, { token: null }).then((body) => expectRefused('myWallet', body, SIGNED_OUT));
    cy.gql<{ myWallet: Wallet }>(WALLET, {}, { token: memberToken }).then(({ myWallet }) => {
      expect(myWallet.balance).to.equal(0);
      expect(myWallet.withdrawer_role).to.equal('HOST');
      wallet = myWallet;
    });
  });

  it('WL-02 an amount of zero, or no payout account, is refused before anything is read', () => {
    cy.gqlRaw(WITHDRAW, { input: { amount: 0, ...UPI } }, { token: memberToken }).then((body) =>
      expectRefused('requestWithdrawal', body, refusal('BAD_USER_INPUT', 'Withdrawal amount must be greater than 0')),
    );
    cy.gqlRaw(WITHDRAW, { input: { amount: 1, payout_method: 'UPI' } }, { token: memberToken }).then((body) =>
      expectRefused('requestWithdrawal', body, refusal('BAD_USER_INPUT', 'Add the payout account details')),
    );
  });

  it('WL-03 a withdrawal larger than the balance is refused and nothing is requested', () => {
    const { currency_symbol: cur, min_withdrawal_amount: min, balance } = wallet;
    const expected =
      min > 0
        ? `A Host can withdraw once the wallet balance reaches ${cur}${min}. Available: ${cur}${balance}.`
        : 'Insufficient wallet balance';
    cy.gqlRaw(WITHDRAW, { input: { amount: 1, ...UPI } }, { token: null }).then((body) =>
      expectRefused('requestWithdrawal', body, SIGNED_OUT),
    );
    cy.gqlRaw(WITHDRAW, { input: { amount: 1, ...UPI } }, { token: memberToken }).then((body) =>
      expectRefused('requestWithdrawal', body, refusal('BAD_USER_INPUT', expected)),
    );
    cy.gqlRaw(WITHDRAWALS, {}, { token: memberToken }).then((body) => expectAnswer('myWithdrawals', body, []));
  });
});
