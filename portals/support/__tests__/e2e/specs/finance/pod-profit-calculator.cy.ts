import type { RunAccount } from '../../support/run-account';
import {
  ZERO_ID,
  consoleAccount,
  expectApiRefused,
  releaseConsoleRole,
  signIn,
  visitAndRead,
} from '../../support/ui-finance-crm';

/**
 * Finance › Pod Profit Calculator (/calculators/pod-profit), as the analyst
 * seat (FINANCE_USER).
 *
 * A fresh calculation takes every rate from Finance › Default Deductions
 * (`PodCalculatorDefaults` reads financeSettings; useCalculatorDefaults.ts) —
 * so the calculator always starts on the stored rates. The analyst reads the
 * saved library (FINANCE_READ); saving, deleting and emailing a calculation
 * are FINANCE_RW (podCalculator.resolver.ts) — refused, probed with an id no
 * calculation carries.
 */

interface Defaults {
  gst_pct: number;
  platform_fee_pct: number;
  default_host_commission_pct: number;
  default_venue_commission_pct: number;
}

const DELETE_CALCULATION = `mutation E2eDeletePodCalculator($id: ID!) {
  deletePodCalculator(calculator_doc_id: $id)
}`;

const EMAIL_CALCULATION = `mutation E2eEmailPodCalculator($id: ID!, $to: String!) {
  emailPodCalculator(calculator_doc_id: $id, to: $to)
}`;

describe('Finance · Pod Profit Calculator (run account, password CHANGED)', () => {
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

  it('FPP-01 a new single-pod calculation starts on the stored default deductions', () => {
    visitAndRead<{ financeSettings: Defaults }>('finance', '/calculators/pod-profit', 'PodCalculatorDefaults').then(
      ({ financeSettings: s }) => {
        const expected: Record<string, number> = {
          'calc-gst_percent': s.gst_pct,
          'calc-platform_fee_percent': s.platform_fee_pct,
          'calc-venue_commission_percent': s.default_venue_commission_pct,
          'calc-host_commission_percent': s.default_host_commission_pct,
        };
        for (const [testId, value] of Object.entries(expected)) {
          cy.byTestId(testId).first().find('input[type="number"]').should('have.value', String(value));
        }
      },
    );
  });

  it('FPP-02 the saved library answers the analyst', () => {
    visitAndRead<{ podCalculators: { id: string }[] }>('finance', '/calculators/pod-profit', 'PodCalculators')
      .its('podCalculators')
      .should('be.an', 'array');
  });

  it('FPP-03 deleting or emailing a saved calculation is refused to the analyst', () => {
    expectApiRefused('finance', account, DELETE_CALCULATION, { id: ZERO_ID }, 'deletePodCalculator');
    expectApiRefused('finance', account, EMAIL_CALCULATION, { id: ZERO_ID, to: account.email }, 'emailPodCalculator');
  });
});
