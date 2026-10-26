/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead, PLATFORM_FINANCE_ONLY } from '../../../support/api-staff';

/**
 * Finance › Withdrawals — the per-role minimums are read by FINANCE_READ and
 * changed by FINANCE_RW less the city-bound admins (finance/wallet/wallet.resolver.ts,
 * finance/financeScope.ts assertPlatformFinanceWrite); a member's request is
 * held to the minimum and the balance on the server
 * (finance/wallet/wallet.service.ts requestWithdrawal → assertWithdrawalEligible
 * → debitWallet). Scenario map: Staff › Withdrawals "Withdrawal settings page"
 * (the server-side refusal).
 */

const ROLES: readonly E2eStaffRole[] = ['FINANCE_USER', 'CITY_ADMIN'];

interface Wallet {
  balance: number;
  currency_symbol: string;
  min_withdrawal_amount: number;
  withdrawer_role: string;
}

const MY_WALLET = `query E2eMyWallet { myWallet { balance currency_symbol min_withdrawal_amount withdrawer_role } }`;
const MY_WITHDRAWALS = `query E2eMyWithdrawalIds { myWithdrawals { id } }`;
const REQUEST = `mutation E2eRequestWithdrawal {
  requestWithdrawal(input: { amount: 1, payout_method: UPI, upi_id: "e2e@upi" }) { id }
}`;
const MINIMUMS = call('withdrawalMinimums', `query E2eWithdrawalMinimums { withdrawalMinimums { host venue_owner } }`);
const SET_MINIMUMS = call(
  'updateWithdrawalMinimums',
  `mutation E2eSetWithdrawalMinimums { updateWithdrawalMinimums(input: {}) { __typename } }`,
);

/** The refusal `assertWithdrawalEligible` / `debitWallet` must give a wallet that cannot cover the request. */
const expectedRefusal = (wallet: Wallet): string =>
  wallet.min_withdrawal_amount > 0
    ? `A Host can withdraw once the wallet balance reaches ${wallet.currency_symbol}${wallet.min_withdrawal_amount}. ` +
      `Available: ${wallet.currency_symbol}${wallet.balance}.`
    : 'Insufficient wallet balance';

describe('API · Withdrawal minimums and the server-side floor', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('WD-01 a member with an empty wallet asking for ₹1 is refused by the server and nothing is debited', () => {
    cy.gql<{ myWallet: Wallet }>(MY_WALLET, {}, { token: memberToken }).then(({ myWallet }) => {
      // The run account has earned nothing, so it withdraws as a Host with a zero balance.
      expect(myWallet.balance, 'a new member has nothing to withdraw').to.equal(0);
      expect(myWallet.withdrawer_role, 'a plain member withdraws as').to.equal('HOST');
      cy.gqlRaw(REQUEST, {}, { token: memberToken }).then((body) =>
        expectRefused('requestWithdrawal', body, { code: 'BAD_USER_INPUT', message: expectedRefusal(myWallet) }),
      );
    });
    cy.gql<{ myWallet: Wallet }>(MY_WALLET, {}, { token: memberToken }).then(({ myWallet }) => {
      expect(myWallet.balance, 'balance after the refused request').to.equal(0);
    });
    cy.gql<{ myWithdrawals: unknown[] }>(MY_WITHDRAWALS, {}, { token: memberToken }).then((data) => {
      expect(data.myWithdrawals, 'no withdrawal was recorded').to.deep.equal([]);
    });
  });

  it('WD-02 FINANCE_USER reads the minimums but is refused changing them', () => {
    asRole('FINANCE_USER', (token) => {
      expectRead<{ host: number }>(token, MINIMUMS).then((minimums) => {
        expect(minimums.host, 'Host minimum').to.be.a('number').and.at.least(0);
      });
      expectCallsRefused(token, [SET_MINIMUMS]);
    });
  });

  it('WD-03 CITY_ADMIN is refused changing the minimums: they apply to every city', () => {
    asRole('CITY_ADMIN', (token) => expectCallsRefused(token, [SET_MINIMUMS], PLATFORM_FINANCE_ONLY));
  });
});
