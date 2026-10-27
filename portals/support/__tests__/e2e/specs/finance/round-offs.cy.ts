import type { RunAccount } from '../../support/run-account';
import {
  consoleAccount,
  expectFirstRow,
  releaseConsoleRole,
  samePaisa,
  signIn,
  visitAndRead,
} from '../../support/ui-finance-crm';

/**
 * Finance › Round Offs (/round-offs), as the analyst seat (FINANCE_USER):
 * every payment whose bill was rounded up to a whole rupee. Read-only.
 *
 * The rule the page accounts for (server payment.roundoff.ts):
 *   bill_amount = total + coins_redeemed − round_off, with 0 < round_off < 1
 * on every listed payment (the base filter is `round_off > 0`), and the strip's
 * count is the server's aggregate over the whole filter.
 */

const TABLE = 'finance-round-offs';

interface RoundOffRow {
  id: string;
  payment_id: string;
  bill_amount: number;
  round_off: number;
  coins_redeemed: number;
  total: number;
}

interface RoundOffsPage {
  paymentRoundOffsTable: {
    total: number;
    summary: { count: number; round_off_total: number };
    rows: RoundOffRow[];
  };
}

describe('Finance · Round Offs (run account, password CHANGED)', () => {
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

  it('FRO-01 every rounded payment reconciles: bill + round-off − coins = total, and the strip counts them all', () => {
    visitAndRead<RoundOffsPage>('finance', '/round-offs', 'PaymentRoundOffsTable').then(({ paymentRoundOffsTable: page }) => {
      expect(page.summary.count, 'the strip counts every rounded payment').to.equal(page.total);
      let pageRoundOff = 0;
      for (const row of page.rows) {
        expect(row.round_off, `${row.payment_id} was rounded up by less than a rupee`).to.be.greaterThan(0).and.lessThan(1);
        expect(
          samePaisa(row.bill_amount + row.round_off - row.coins_redeemed, row.total),
          `${row.payment_id}: ${row.bill_amount} + ${row.round_off} − ${row.coins_redeemed} = ${row.total}`,
        ).to.be.true;
        pageRoundOff += row.round_off;
      }
      // The page on screen can never add up to more than the filter-wide total.
      expect(pageRoundOff, 'this page of round-offs').to.be.at.most(page.summary.round_off_total + 0.01);
      expectFirstRow(TABLE, page.rows, (r) => r.id);
      cy.byTestId('finance-round-offs-totals').should('contain.text', String(page.summary.count));
    });
  });

  it('FRO-02 a round-off opens the payment it belongs to', () => {
    visitAndRead<RoundOffsPage>('finance', '/round-offs', 'PaymentRoundOffsTable').then(({ paymentRoundOffsTable: page }) => {
      expect(page.rows, 'staging holds a rounded payment').to.have.length.greaterThan(0);
      const [row] = page.rows;
      if (!row) return;
      cy.byTestId(`${TABLE}-row-${row.id}`).first().click(24, 16);
      cy.location('pathname').should('eq', `/payment-logs/${row.id}`);
      cy.byTestId('payment-detail-id').should('have.text', row.payment_id);
    });
  });
});
