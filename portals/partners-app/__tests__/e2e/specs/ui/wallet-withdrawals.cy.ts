/// <reference types="cypress" />
import { partnerWorld, signInRunPartner, visitAndWait } from '../../support/ui-partners-3';

/**
 * Wallet & withdrawals, live (scenario map › Partners › Wallet & withdrawals).
 *
 * /wallet (src/pages/wallet-page/WalletPage) reads `myWallet`,
 * `myWalletTransactions` and `myWithdrawals` in one request (MyWallet). The
 * run's partner account has earned nothing — its pod is FREE and no money
 * moves on the platform — so its balance sits below the role minimum and the
 * Withdraw button stays disabled. Nothing is requested: no withdrawal, no
 * statement, no money.
 */

const MY_WALLET = `query E2eUiP3Wallet {
  myWallet { balance currency_symbol min_withdrawal_amount can_withdraw }
  myWalletTransactions { id }
  myWithdrawals { id }
}`;

interface WalletData {
  myWallet: { balance: number; currency_symbol: string | null; min_withdrawal_amount: number | null; can_withdraw: boolean | null };
  myWalletTransactions: Array<{ id: string }>;
  myWithdrawals: Array<{ id: string }>;
}

describe('Partners · Wallet & withdrawals (the run’s partner account)', () => {
  let wallet: WalletData;

  before(() => {
    signInRunPartner();
    partnerWorld();
    cy.gql<WalletData>(MY_WALLET).then((data) => {
      wallet = data;
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('WW-01 shows the balance the server holds, and every withdrawal and transaction it lists (or their empty notes)', () => {
    visitAndWait('/wallet', 'MyWallet');
    const currency = wallet.myWallet.currency_symbol ?? '₹';
    cy.byTestId('wallet-page').should('be.visible');
    cy.byTestId('wallet-balance').should('have.text', `${currency}${wallet.myWallet.balance.toFixed(2)}`);
    if (wallet.myWithdrawals.length === 0) {
      cy.byTestId('wallet-withdrawals-empty').should('have.text', 'No withdrawals yet.');
    } else {
      wallet.myWithdrawals.forEach((row) => cy.byTestId(`wallet-withdrawal-${row.id}`).should('be.visible'));
    }
    if (wallet.myWalletTransactions.length === 0) {
      cy.byTestId('wallet-transactions-empty').should('have.text', 'Your payouts will show up here.');
    } else {
      wallet.myWalletTransactions.forEach((row) => cy.byTestId(`wallet-transaction-${row.id}`).should('be.visible'));
    }
  });

  it('WW-02 below the role minimum the Withdraw button is disabled, with the minimum spelled out', () => {
    const { balance, can_withdraw: canWithdraw, min_withdrawal_amount: minimum, currency_symbol: symbol } = wallet.myWallet;
    if (canWithdraw !== false) {
      throw new Error(`The run account can withdraw (balance ${balance}); this scenario needs a balance below the minimum.`);
    }
    visitAndWait('/wallet', 'MyWallet');
    cy.byTestId('wallet-withdraw').should('be.disabled').and('have.text', 'Withdraw');
    const min = minimum ?? 0;
    if (min > 0) {
      cy.byTestId('wallet-min-withdrawal').should(
        'have.text',
        `You can withdraw once your balance reaches ${symbol ?? '₹'}${min.toFixed(2)}.`,
      );
    } else {
      cy.byTestId('wallet-min-withdrawal').should('not.exist');
    }
  });
});
