import type { RunAccount } from '../../support/run-account';
import { consoleAccount, expectApiRefused, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';

/**
 * Finance › Default Deductions (/default-deductions), as the analyst seat
 * (FINANCE_USER).
 *
 * Seven slider cards open on `financeSettings`' stored rates, each with a live
 * `<value>%` chip (DeductionSlider.tsx). Saving them together is the ADMIN_RW
 * `updateFinanceSettings` — refused to the analyst, so "the calculator starts
 * with the new rates" is a FINANCE_MANAGER scenario this run cannot hold.
 */

const RATE_KEYS = [
  'gst_pct',
  'platform_fee_pct',
  'default_host_commission_pct',
  'default_venue_commission_pct',
  'default_product_commission_pct',
  'default_club_admin_pct',
  'default_backout_deduction_pct',
] as const;

type Rates = Record<(typeof RATE_KEYS)[number], number>;

const UPDATE_DEDUCTIONS = `mutation E2eUpdateDeductions($input: UpdateFinanceSettingsInput!) {
  updateFinanceSettings(input: $input) { gst_pct }
}`;

describe('Finance · Default Deductions (run account, password CHANGED)', () => {
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

  it('FDD-01 every slider card opens on the stored rate', () => {
    visitAndRead<{ financeSettings: Rates }>('finance', '/default-deductions', 'DeductionSettings').then(({ financeSettings }) => {
      for (const key of RATE_KEYS) {
        cy.byTestId(`deduction-${key}`).should('contain.text', `${financeSettings[key]}%`);
      }
    });
  });

  it('FDD-02 saving the default deductions is refused to the analyst', () => {
    expectApiRefused('finance', account, UPDATE_DEDUCTIONS, { input: {} }, 'updateFinanceSettings');
  });
});
