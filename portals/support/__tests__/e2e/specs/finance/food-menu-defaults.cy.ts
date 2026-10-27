import type { RunAccount } from '../../support/run-account';
import { apiRead, consoleAccount, expectApiRefused, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';
import { countOperation, expectNotSent } from '../../support/ui-staff';

/**
 * Finance › Food Menu Defaults (GST) (/food-menu-defaults), as the analyst seat
 * (FINANCE_USER).
 *
 * The form opens on what `foodTaxDefaults` stores (tax mode and default GST).
 * Its Zod rule (makeFoodTaxDefaultsSchema, @duncit/forms) holds the rate to
 * FOOD_GST_LIMITS (0–28), so an out-of-range rate is stopped before anything is
 * sent. Saving is an ADMIN_RW write (`updateFoodTaxDefaults` in
 * finance.resolver.ts) — the analyst is refused, so persisting a new rate is a
 * FINANCE_MANAGER scenario this run cannot hold.
 */

interface FoodTaxDefaults {
  tax_mode: 'INCLUSIVE' | 'EXCLUSIVE';
  gst_pct: number;
}

const FOOD_TAX_DEFAULTS = `query E2eFoodTaxDefaults { foodTaxDefaults { tax_mode gst_pct } }`;

const UPDATE_FOOD_TAX_DEFAULTS = `mutation E2eUpdateFoodTaxDefaults($input: FoodTaxDefaultsInput!) {
  updateFoodTaxDefaults(input: $input) { tax_mode gst_pct }
}`;

describe('Finance · Food Menu Defaults (run account, password CHANGED)', () => {
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

  it('FMD-01 the form opens on the stored GST mode and rate, with nothing to save yet', () => {
    visitAndRead<{ foodTaxDefaults: FoodTaxDefaults }>('finance', '/food-menu-defaults', 'FoodTaxDefaults').then(
      ({ foodTaxDefaults }) => {
        cy.byTestId('food-tax-defaults-mode').find('input:checked').should('have.value', foodTaxDefaults.tax_mode);
        cy.byTestId('food-tax-defaults-gst').find('input').should('have.value', String(foodTaxDefaults.gst_pct));
        cy.byTestId('food-tax-defaults-save').should('be.disabled');
      },
    );
  });

  it('FMD-02 a rate above 28% is marked invalid and never sent', () => {
    visitAndRead('finance', '/food-menu-defaults', 'FoodTaxDefaults');
    const updates = countOperation('UpdateFoodTaxDefaults');
    cy.byTestId('food-tax-defaults-gst').find('input').clear().type('29').blur();
    cy.byTestId('food-tax-defaults-gst').find('input').should('have.attr', 'aria-invalid', 'true');
    cy.byTestId('food-tax-defaults-save').should('be.enabled').click();
    cy.byTestId('food-tax-defaults-gst').find('input').should('have.attr', 'aria-invalid', 'true');
    expectNotSent(updates, 'UpdateFoodTaxDefaults');
  });

  it('FMD-03 saving the GST defaults is refused to the analyst', () => {
    // The stored values themselves: a gate that let this through would change nothing.
    apiRead<{ foodTaxDefaults: FoodTaxDefaults }>('finance', account, FOOD_TAX_DEFAULTS).then(({ foodTaxDefaults }) => {
      const input = { tax_mode: foodTaxDefaults.tax_mode, gst_pct: foodTaxDefaults.gst_pct };
      expectApiRefused('finance', account, UPDATE_FOOD_TAX_DEFAULTS, { input }, 'updateFoodTaxDefaults');
    });
  });
});
