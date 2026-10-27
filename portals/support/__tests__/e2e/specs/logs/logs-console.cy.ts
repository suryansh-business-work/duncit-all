import type { RunAccount } from '../../support/run-account';
import {
  ZERO_ID,
  expectApiRefused,
  releaseConsoleRole,
  signIn,
  soleConsoleAccount,
  visitAndRead,
} from '../../support/ui-finance-crm';

/**
 * Logs › Logs console: every log the other consoles keep, each sidebar entry
 * that console's own page mounted at its own path (portals/logs/src/routes.tsx,
 * log-pages.ts).
 *
 * The run account holds LOGS_MANAGER ONLY here — the three portal roles would
 * open Legal's acceptance log and the Pods audit on their own — so every read
 * answering proves `LOGS_READER` (server/src/middleware/rbac.ts) opens it.
 * Writes never take that role: acting on a row stays with the console that
 * owns it, which the refund / retry / delete probes prove.
 */

/** Each borrowed page, and the read it is built on. */
const LOG_PAGES: readonly { path: string; operation: string }[] = [
  { path: '/telemetry/logs', operation: 'TelemetryLogsTable' },
  { path: '/telemetry/error-logs', operation: 'ErrorLogsTable' },
  { path: '/openai/logs', operation: 'OpenAiUsageLogsTable' },
  { path: '/emails/logs', operation: 'EmailLogsTable' },
  { path: '/payment-logs', operation: 'PaymentsTable' },
  { path: '/user-refund-logs', operation: 'UserRefundsTable' },
  { path: '/gift-cards/logs', operation: 'FinanceGiftCardTransactionsTable' },
  { path: '/duncit-coin/transactions', operation: 'AdminCoinTransactionsTable' },
  { path: '/policy-acceptance-logs', operation: 'LegalPolicyAcceptancesTable' },
];

const REFUND_PAYMENT = `mutation E2eRefundPayment($id: ID!) { refundPayment(payment_doc_id: $id) { id } }`;

const RETRY_PAYMENT_STEPS = `mutation E2eRetryPaymentSteps($id: ID!) {
  retryPaymentSteps(payment_doc_id: $id) { payment { id } }
}`;

const DELETE_EMAIL_LOGS = `mutation E2eDeleteEmailLogs($ids: [ID!]!) { deleteEmailLogs(ids: $ids) }`;

describe('Logs · Logs console (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = soleConsoleAccount('logs');
  });

  beforeEach(() => {
    signIn('logs', account);
  });

  after(() => {
    releaseConsoleRole(account, 'logs');
  });

  for (const { path, operation } of LOG_PAGES) {
    it(`LGC-01 ${path} loads its log for a LOGS_MANAGER seat (${operation})`, () => {
      visitAndRead('logs', path, operation);
      cy.location('pathname').should('eq', path);
    });
  }

  it('LGC-02 a payment opened from the log reads its audit page here too', () => {
    visitAndRead<{ paymentsTable: { rows: { id: string; payment_id: string }[] } }>('logs', '/payment-logs', 'PaymentsTable').then(
      ({ paymentsTable }) => {
        const [payment] = paymentsTable.rows;
        expect(payment, 'staging holds a payment').to.exist;
        if (!payment) return;
        cy.interceptOperation('PaymentDetail');
        cy.byTestId(`finance-payments-row-${payment.id}`).first().click(24, 16);
        cy.location('pathname').should('eq', `/payment-logs/${payment.id}`);
        cy.wait('@PaymentDetail').its('response.body.errors').should('be.undefined');
        cy.byTestId('payment-detail-id').should('have.text', payment.payment_id);
      },
    );
  });

  it('LGC-03 the writes those pages offer stay with their own consoles — refused here', () => {
    expectApiRefused('logs', account, REFUND_PAYMENT, { id: ZERO_ID }, 'refundPayment');
    expectApiRefused('logs', account, RETRY_PAYMENT_STEPS, { id: ZERO_ID }, 'retryPaymentSteps');
    expectApiRefused('logs', account, DELETE_EMAIL_LOGS, { ids: [ZERO_ID] }, 'deleteEmailLogs');
  });
});
