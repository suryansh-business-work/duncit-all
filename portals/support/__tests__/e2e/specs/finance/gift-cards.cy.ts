import type { RunAccount } from '../../support/run-account';
import {
  consoleAccount,
  expectApiRefused,
  expectFirstRow,
  releaseConsoleRole,
  signIn,
  visitAndRead,
} from '../../support/ui-finance-crm';

/**
 * Finance › Gift Cards (/gift-cards/dashboard, /gift-cards/cards,
 * /gift-cards/logs), as the analyst seat (FINANCE_USER). Read-only tables.
 *
 * The analyst reads the stats, the sold cards and their ledger
 * (GIFT_CARD_ADMIN_READ / GIFT_CARD_LOG_READ in giftcard.resolver.ts). The
 * sales policy is GIFT_CARD_ADMIN_WRITE (SUPER_ADMIN, FINANCE_MANAGER) —
 * refused, probed with an empty input.
 */

interface GiftCardStats {
  sold_count: number;
  redeemed_count: number;
  sold_value: number;
  redeemed_value: number;
}

interface GiftCardRow {
  id: string;
  code: string;
  initial_amount: number;
  balance: number;
}

interface GiftCardTxn {
  id: string;
  amount: number;
}

const UPDATE_GIFT_CARD_SETTINGS = `mutation E2eUpdateGiftCardSettings($input: GiftCardSettingsInput!) {
  updateGiftCardSettings(input: $input) { updated_at }
}`;

describe('Finance · Gift Cards (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = consoleAccount('finance');
  });

  beforeEach(() => {
    signIn('finance', account);
  });

  after(() => {
    releaseConsoleRole(account, 'finance');
  });

  it('FGC-01 the dashboard never counts more cards redeemed than sold', () => {
    visitAndRead<{ giftCardAdminStats: GiftCardStats }>('finance', '/gift-cards/dashboard', 'FinanceGiftCardAdminStats').then(
      ({ giftCardAdminStats: stats }) => {
        expect(stats.redeemed_count, 'redeemed cards').to.be.at.most(stats.sold_count);
        expect(stats.sold_value, 'sold value').to.be.at.least(0);
      },
    );
  });

  it('FGC-02 every sold card holds a balance between nothing and what it was bought for', () => {
    visitAndRead<{ giftCardsTable: { rows: GiftCardRow[] } }>('finance', '/gift-cards/cards', 'FinanceGiftCardsTable').then(
      ({ giftCardsTable }) => {
        for (const card of giftCardsTable.rows) {
          expect(card.balance, `card ${card.code}`).to.be.at.least(0).and.at.most(card.initial_amount + 0.01);
        }
        expectFirstRow('finance-gift-cards', giftCardsTable.rows, (r) => r.id);
      },
    );
  });

  it('FGC-03 the gift card ledger lists its movements', () => {
    visitAndRead<{ giftCardTransactionsTable: { rows: GiftCardTxn[] } }>(
      'finance',
      '/gift-cards/logs',
      'FinanceGiftCardTransactionsTable',
    ).then(({ giftCardTransactionsTable }) => {
      expectFirstRow('finance-gift-card-logs', giftCardTransactionsTable.rows, (r) => r.id);
      if (giftCardTransactionsTable.rows.length === 0) cy.byTestId('duncit-table-empty').should('be.visible');
    });
  });

  it('FGC-04 changing the gift card sales policy is refused to the analyst', () => {
    expectApiRefused('finance', account, UPDATE_GIFT_CARD_SETTINGS, { input: {} }, 'updateGiftCardSettings');
  });
});
