import type { MockedResponse } from '@apollo/client/testing';
import type { FinanceSettings } from '@duncit/gql-types';
import { INVOICE_SETTINGS, UPDATE_INVOICE_SETTINGS } from '../../src/pages/finance/invoice-management-page/queries';

/**
 * Invoice Management reads/writes the branding slice of `financeSettings`. The
 * projection is a schema-synced `Pick`; the page reads each field defensively
 * (`?? default`), so the mock allows `null` to drive those fallbacks.
 */
type InvoiceKeys =
  | 'dummy_mode'
  | 'currency_symbol'
  | 'invoice_prefix'
  | 'business_name'
  | 'business_address'
  | 'business_gstin'
  | 'invoice_label'
  | 'invoice_support_email'
  | 'invoice_support_phone'
  | 'invoice_footer_note'
  | 'invoice_terms'
  | 'invoice_logo_url'
  | 'updated_at';

type Nullable<T> = { [K in keyof T]: T[K] | null };

export type InvoiceSettings = { __typename?: 'FinanceSettings' } & Nullable<
  Pick<FinanceSettings, InvoiceKeys>
>;

export const makeInvoiceSettings = (over: Partial<InvoiceSettings> = {}): InvoiceSettings => ({
  __typename: 'FinanceSettings',
  dummy_mode: false,
  currency_symbol: '₹',
  invoice_prefix: 'DUN',
  business_name: 'Duncit Pvt Ltd',
  business_address: '1 MG Road',
  business_gstin: '29ABCDE1234F1Z5',
  invoice_label: 'TAX INVOICE',
  invoice_support_email: 'help@duncit.com',
  invoice_support_phone: '+91 90000',
  invoice_footer_note: 'Thanks!',
  invoice_terms: 'Net 30',
  invoice_logo_url: '',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Every branding field `null` — drives each `?? default` fallback in the mapper. */
export const nullInvoiceSettings = (): InvoiceSettings =>
  makeInvoiceSettings({
    dummy_mode: null,
    currency_symbol: null,
    invoice_prefix: null,
    business_name: null,
    business_address: null,
    business_gstin: null,
    invoice_label: null,
    invoice_support_email: null,
    invoice_support_phone: null,
    invoice_footer_note: null,
    invoice_terms: null,
    invoice_logo_url: null,
  });

export const invoiceSettingsMock = (
  settings: InvoiceSettings | null = makeInvoiceSettings(),
): MockedResponse => ({
  request: { query: INVOICE_SETTINGS },
  result: { data: { financeSettings: settings } },
  maxUsageCount: 20,
});

export const invoiceSettingsLoadingMock = (): MockedResponse => ({
  request: { query: INVOICE_SETTINGS },
  result: { data: { financeSettings: makeInvoiceSettings() } },
  delay: 60_000,
});

export const updateInvoiceSettingsMock = (
  over: { fail?: boolean; delay?: number } = {},
): MockedResponse => ({
  request: { query: UPDATE_INVOICE_SETTINGS },
  variableMatcher: () => true,
  ...(over.delay ? { delay: over.delay } : {}),
  ...(over.fail
    ? { error: new Error('save boom') }
    : {
        result: {
          data: {
            updateFinanceSettings: {
              __typename: 'FinanceSettings',
              business_name: 'Acme',
              invoice_label: 'TAX INVOICE',
              dummy_mode: false,
              updated_at: '2026-01-02T00:00:00.000Z',
            },
          },
        },
      }),
});
