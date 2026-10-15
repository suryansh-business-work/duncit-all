import type { RunAccount } from '../../support/run-account';
import { consoleAccount, expectApiRefused, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';

/**
 * Finance › Invoices (/invoices, /invoices/venue, /invoices/host,
 * /invoices/product), as the analyst seat (FINANCE_USER).
 *
 * Invoice Management opens on the stored business identity; each payout
 * template page opens on its own kind's saved heading, terms and footer
 * (`financeSettings.invoice_templates.<kind>`, KIND_META titles in
 * invoice-template-page/queries.ts). Every save is the ADMIN_RW
 * `updateFinanceSettings`, refused to the analyst ("Access Denied").
 */

type Kind = 'venue' | 'host' | 'product';

interface Template {
  label: string;
  terms: string;
  footer: string;
}

const KIND_TITLE: Readonly<Record<Kind, string>> = {
  venue: 'Venue Invoice',
  host: 'Host Invoice',
  product: 'Product Invoice',
};

const UPDATE_FINANCE_SETTINGS = `mutation E2eUpdateInvoiceSettings($input: UpdateFinanceSettingsInput!) {
  updateFinanceSettings(input: $input) { business_name }
}`;

describe('Finance · Invoices (run account, password CHANGED)', () => {
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

  it('FIN-01 Invoice Management opens on the stored business identity', () => {
    visitAndRead<{ financeSettings: { business_name: string | null } }>('finance', '/invoices', 'InvoiceSettings').then(
      ({ financeSettings }) => {
        cy.byTestId('invoice-business-name').find('input').should('have.value', financeSettings.business_name ?? '');
      },
    );
  });

  for (const kind of ['venue', 'host', 'product'] as const) {
    it(`FIN-02-${kind} the ${kind} payout template opens under its own title with its own saved text`, () => {
      visitAndRead<{ financeSettings: { invoice_templates: Record<Kind, Template | null> } }>(
        'finance',
        `/invoices/${kind}`,
        'InvoiceTemplates',
      ).then(({ financeSettings }) => {
        const template = financeSettings.invoice_templates[kind];
        cy.byTestId('invoice-template-title').should('have.text', KIND_TITLE[kind]);
        cy.byTestId('invoice-template-label').find('input').should('have.value', template?.label ?? '');
        cy.byTestId('invoice-template-terms').find('textarea').first().should('have.value', template?.terms ?? '');
        cy.byTestId('invoice-template-footer').find('input').should('have.value', template?.footer ?? '');
      });
    });
  }

  it('FIN-03 saving the business identity or a payout template is refused to the analyst', () => {
    expectApiRefused('finance', account, UPDATE_FINANCE_SETTINGS, { input: {} }, 'updateFinanceSettings');
  });
});
