import type { RunAccount } from '../../support/run-account';
import { consoleAccount, expectApiRefused, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';
import { pickOption, selectShows } from '../../support/ui-staff';

/**
 * Finance › Payout Cycles (/payouts), as the analyst seat (FINANCE_USER).
 *
 * The disbursement schedule opens on `financeSettings`' venue and host payout
 * modes. The day and time fields only exist while a mode is scheduled — the day
 * only while one is WEEKLY (PayoutCyclesPage.tsx `scheduled` / `weekly`). The
 * spec flips the selects on screen and never presses Save: saving is an
 * ADMIN_RW `updateFinanceSettings`, refused to the analyst through the API.
 */

/** `PAYOUT_MODES` in payout-cycles-page/queries.ts. */
const MODE_LABEL: Readonly<Record<string, string>> = {
  IMMEDIATE: 'Immediately (on approval)',
  WEEKLY: 'Weekly',
  MONTH_END: 'Month end',
};

interface PayoutSettings {
  venue_payout_mode: string;
  host_payout_mode: string;
}

const UPDATE_FINANCE_SETTINGS = `mutation E2eUpdatePayoutSettings($input: UpdateFinanceSettingsInput!) {
  updateFinanceSettings(input: $input) { venue_payout_mode }
}`;

describe('Finance · Payout Cycles (run account, password CHANGED)', () => {
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

  it('FPC-01 the schedule opens on the stored venue and host payout modes', () => {
    visitAndRead<{ financeSettings: PayoutSettings }>('finance', '/payouts', 'PayoutSettings').then(({ financeSettings }) => {
      selectShows('payout-venue-mode', MODE_LABEL[financeSettings.venue_payout_mode] ?? financeSettings.venue_payout_mode);
      selectShows('payout-host-mode', MODE_LABEL[financeSettings.host_payout_mode] ?? financeSettings.host_payout_mode);
    });
  });

  it('FPC-02 immediate payouts hide the day and time; weekly asks for a day; month end asks only for a time', () => {
    visitAndRead('finance', '/payouts', 'PayoutSettings');
    pickOption('payout-venue-mode', 'payout-mode-IMMEDIATE');
    pickOption('payout-host-mode', 'payout-mode-IMMEDIATE');
    cy.byTestId('payout-schedule-fields').should('not.exist');

    pickOption('payout-venue-mode', 'payout-mode-WEEKLY');
    cy.byTestId('payout-schedule-fields').should('be.visible');
    cy.byTestId('payout-day').should('be.visible');

    pickOption('payout-venue-mode', 'payout-mode-MONTH_END');
    cy.byTestId('payout-schedule-fields').should('be.visible');
    cy.byTestId('payout-day').should('not.exist');
  });

  it('FPC-03 saving a payout cycle is refused to the analyst', () => {
    expectApiRefused('finance', account, UPDATE_FINANCE_SETTINGS, { input: {} }, 'updateFinanceSettings');
  });
});
