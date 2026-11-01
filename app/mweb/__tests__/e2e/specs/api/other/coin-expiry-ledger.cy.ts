/// <reference types="cypress" />
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused } from '../../../support/api-staff';

/**
 * Server: Duncit Coin expiry — what the sweep leaves in the ledger.
 *
 * Every expiring grant is a CREDIT "lot" with `expires_at` (the END of the day,
 * app time zone, coin_expiry_days after the grant) and `remaining`; every ten
 * minutes runCoinExpirySweep zeroes the remaining of each lapsed lot and
 * writes one COIN_EXPIRY DEBIT "Unused coins from <date> expired"
 * (finance/coin/coin.expiry.ts). Scenario map: Server › Duncit Coin expiry —
 * "Expire an unspent lot" and "Partial spend and never-expiring coins".
 *
 * Granting coins or back-dating a lot is a money write the suite never makes.
 * It reads the platform ledger as a City Admin (LOYALTY_ADMIN_READ) and holds
 * the rows the sweep and the grants already wrote to the rules above.
 */

interface LedgerRow {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  source: string;
  reason: string;
  expires_at: string | null;
  remaining: number;
  created_at: string;
}

const ledger = (field: string, value: string) =>
  call(
    'coinTransactionsTable',
    `query E2eCoinLedger($query: TableQueryInput) { coinTransactionsTable(query: $query) {
      total rows { id type amount balance_after source reason expires_at remaining created_at }
    } }`,
    { query: { page: 1, page_size: 100, filters: [{ field, op: 'eq', value }] } },
  );
const COIN_SETTINGS = `query E2eCoinExpirySettings { coinSettings { coin_expiry_days coin_expiry_reminder_days } }`;
const TIME_ZONE = `query E2eAppTimeZone { publicAppSettings { time_zone } }`;
const UPDATE_COIN_SETTINGS = call(
  'updateCoinSettings',
  `mutation E2eUpdateCoinExpiry { updateCoinSettings(input: {}) { coin_expiry_days } }`,
);

/** Ten-minute ticks, plus room for a restart's ~2-minute first delay. */
const SWEEP_GRACE_MS = 30 * 60_000;

/** The wall clock of `iso` in `timeZone`, as HH:mm:ss. */
const wallClock = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(
    new Date(iso),
  );

describe('API · The coin ledger shows every lapsed lot taken back once', { testIsolation: false }, () => {
  let timeZone = '';

  before(() => {
    signInRunMember().then((token) => {
      expectCallsRefused(token, [ledger('source', 'COIN_EXPIRY')]);
    });
    cy.gql<{ publicAppSettings: { time_zone: string } }>(TIME_ZONE, {}, { token: null }).then((data) => {
      timeZone = data.publicAppSettings.time_zone;
    });
  });

  after(() => {
    revokeRunRoles(['CITY_ADMIN']);
  });

  it('CE-01 the expiry window is a whole number of days (0 = never), and City Admins cannot change it', () => {
    asRole('CITY_ADMIN', (token) => {
      cy.gql<{ coinSettings: { coin_expiry_days: number; coin_expiry_reminder_days: number } }>(COIN_SETTINGS, {}, { token }).then(
        ({ coinSettings }) => {
          expect(Number.isInteger(coinSettings.coin_expiry_days), 'coin_expiry_days').to.equal(true);
          expect(coinSettings.coin_expiry_days).to.be.at.least(0);
          expect(coinSettings.coin_expiry_reminder_days, 'reminder days (capped at 60)').to.be.within(0, 60);
        },
      );
      // LOYALTY_ADMIN_WRITE leaves CITY_ADMIN out; the empty input would change nothing anyway.
      expectCallsRefused(token, [UPDATE_COIN_SETTINGS]);
    });
  });

  it('CE-02 every COIN_EXPIRY row is a debit that names the grant date and never takes the balance below zero', () => {
    asRole('CITY_ADMIN', (token) => {
      const c = ledger('source', 'COIN_EXPIRY');
      cy.gql<{ coinTransactionsTable: { rows: LedgerRow[] } }>(c.query, c.variables, { token }).then(({ coinTransactionsTable }) => {
        coinTransactionsTable.rows.forEach((row) => {
          expect(row.source).to.equal('COIN_EXPIRY');
          expect(row.type, `${row.id} type`).to.equal('DEBIT');
          expect(row.amount, `${row.id} amount`).to.be.greaterThan(0);
          expect(row.balance_after, `${row.id} balance_after`).to.be.at.least(0);
          expect(row.reason, `${row.id} reason`).to.match(/^Unused coins from \S.* expired$/);
          expect(row.expires_at, `${row.id} a debit never expires`).to.equal(null);
        });
      });
    });
  });

  it('CE-03 each expiring grant ends at the last millisecond of a day in the app time zone and is swept once lapsed', () => {
    asRole('CITY_ADMIN', (token) => {
      const c = ledger('type', 'CREDIT');
      cy.gql<{ coinTransactionsTable: { rows: LedgerRow[] } }>(c.query, c.variables, { token }).then(({ coinTransactionsTable }) => {
        const lots = coinTransactionsTable.rows.filter((row) => row.expires_at);
        cy.log(`${lots.length} expiring lot(s) on the newest page of grants`);
        lots.forEach((lot) => {
          const expiresAt = String(lot.expires_at);
          expect(wallClock(expiresAt, timeZone), `${lot.id} lapses at the end of a ${timeZone} day`).to.equal('23:59:59');
          expect(new Date(expiresAt).getUTCMilliseconds(), `${lot.id} last millisecond`).to.equal(999);
          expect(Date.parse(expiresAt), `${lot.id} lapses after it was granted`).to.be.greaterThan(Date.parse(lot.created_at));
          expect(lot.remaining, `${lot.id} remaining`).to.be.within(0, lot.amount);
          if (Date.parse(expiresAt) < Date.now() - SWEEP_GRACE_MS) {
            expect(lot.remaining, `${lot.id} lapsed at ${expiresAt}: the sweep has taken back what was left`).to.equal(0);
          }
        });
      });
    });
  });
});
