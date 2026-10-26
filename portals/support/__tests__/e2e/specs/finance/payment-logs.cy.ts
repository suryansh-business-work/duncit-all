import type { RunAccount } from '../../support/run-account';
import {
  ZERO_ID,
  consoleAccount,
  expectApiRefused,
  expectFirstRow,
  releaseConsoleRole,
  requireRows,
  signIn,
  visitAndRead,
} from '../../support/ui-finance-crm';
import { downloaded, wideViewport } from '../../support/ui-staff';

/**
 * Finance › Payment Logs (/payment-logs), as the analyst seat (FINANCE_USER).
 *
 * The analyst reads every payment (LOG_READ in payment.resolver.ts), opens a
 * payment's audit page and downloads its invoice (INVOICE_READ). Refunding a
 * payment and re-running its checkout steps are ADMIN_RW writes — refused, and
 * probed with an id no payment carries so nothing could ever move.
 */

const TABLE = 'finance-payments';

interface PaymentRow {
  id: string;
  payment_id: string;
  invoice_no: string | null;
  status: string;
}

const REFUND_PAYMENT = `mutation E2eRefundPayment($id: ID!, $reason: String) {
  refundPayment(payment_doc_id: $id, reason: $reason) { id }
}`;

const RETRY_PAYMENT_STEPS = `mutation E2eRetryPaymentSteps($id: ID!) {
  retryPaymentSteps(payment_doc_id: $id) { payment { id } }
}`;

/** `handleDownloadInvoice` in PaymentLogsPage.tsx names the file this way. */
const invoiceFile = (invoiceNo: string): string => `invoice-${invoiceNo.replaceAll(/[^A-Za-z0-9_-]+/g, '-')}.pdf`;

describe('Finance · Payment Logs (run account, password CHANGED)', () => {
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

  it('FPL-01 the log lists payments newest first and a row opens that payment\'s audit page', () => {
    visitAndRead<{ paymentsTable: { rows: PaymentRow[] } }>('finance', '/payment-logs', 'PaymentsTable').then(
      ({ paymentsTable }) => {
        const rows = requireRows(paymentsTable.rows, 'at least one payment');
        expectFirstRow(TABLE, rows, (r) => r.id);
        cy.interceptOperation('PaymentDetail');
        cy.byTestId(`${TABLE}-row-${rows[0].id}`).first().click(24, 16);
        cy.location('pathname').should('eq', `/payment-logs/${rows[0].id}`);
        cy.wait('@PaymentDetail').its('response.body.errors').should('be.undefined');
        cy.byTestId('payment-detail-id').should('have.text', rows[0].payment_id);
      },
    );
  });

  it('FPL-02 a payment with an invoice number downloads invoice-<invoice_no>.pdf', () => {
    wideViewport();
    visitAndRead<{ paymentsTable: { rows: PaymentRow[] } }>('finance', '/payment-logs', 'PaymentsTable').then(
      ({ paymentsTable }) => {
        const invoiced = paymentsTable.rows.find((r) => !!r.invoice_no);
        expect(invoiced, 'the first page of payments holds one with an invoice number').to.exist;
        if (!invoiced?.invoice_no) return;
        cy.interceptOperation('InvoicePdf');
        cy.byTestId(`${TABLE}-row-${invoiced.id}`).find('[data-testid="finance-payments-download-invoice"]').click();
        cy.wait('@InvoicePdf').its('response.body.data.paymentInvoicePdfBase64').should('be.a', 'string').and('not.be.empty');
        cy.readFile(downloaded(invoiceFile(invoiced.invoice_no)), 'binary').should('have.length.greaterThan', 0);
        // Downloading never navigates to the audit page.
        cy.location('pathname').should('eq', '/payment-logs');
      },
    );
  });

  it('FPL-03 an id no payment carries shows "Payment not found" instead of an audit page', () => {
    cy.interceptOperation('PaymentDetail');
    cy.visitPortal('finance', `/payment-logs/${ZERO_ID}`);
    cy.wait('@PaymentDetail').its('response.body.errors.0.message').should('eq', 'Payment not found');
    cy.byTestId('query-guard-error').should('contain.text', 'Payment not found');
    cy.byTestId('payment-detail-id').should('not.exist');
  });

  it('FPL-04 refunding a payment and re-running its steps are refused to the analyst', () => {
    expectApiRefused('finance', account, REFUND_PAYMENT, { id: ZERO_ID, reason: 'e2e refusal probe' }, 'refundPayment');
    expectApiRefused('finance', account, RETRY_PAYMENT_STEPS, { id: ZERO_ID }, 'retryPaymentSteps');
  });
});
