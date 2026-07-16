import type { MockedResponse } from '@apollo/client/testing';
import type { InvoiceTemplates, PartyInvoiceTemplate } from '@duncit/gql-types';
import {
  INVOICE_TEMPLATES,
  UPDATE_INVOICE_TEMPLATE,
} from '../../src/pages/finance/invoice-template-page/queries';

/**
 * Invoice template mocks. Each party template is a schema-synced slice of the
 * generated `PartyInvoiceTemplate`; fields are nullable so the page's
 * `?? ''` fallbacks are exercised.
 */
type Nullable<T> = { [K in keyof T]: T[K] | null };

export type TemplateMock = { __typename?: 'PartyInvoiceTemplate' } & Nullable<
  Pick<PartyInvoiceTemplate, 'label' | 'terms' | 'footer' | 'note'>
>;

export const makeTemplate = (over: Partial<TemplateMock> = {}): TemplateMock => ({
  __typename: 'PartyInvoiceTemplate',
  label: '',
  terms: '',
  footer: '',
  note: '',
  ...over,
});

export type InvoiceTemplatesMock = { __typename?: 'InvoiceTemplates' } & Record<
  keyof Pick<InvoiceTemplates, 'venue' | 'host' | 'product'>,
  TemplateMock
>;

export const makeInvoiceTemplates = (
  over: Partial<InvoiceTemplatesMock> = {},
): InvoiceTemplatesMock => ({
  __typename: 'InvoiceTemplates',
  venue: makeTemplate(),
  host: makeTemplate(),
  product: makeTemplate(),
  ...over,
});

/** `financeSettings.invoice_templates` may be `null` — drives the skip branch. */
export const invoiceTemplatesMock = (
  templates: InvoiceTemplatesMock | null,
): MockedResponse => ({
  request: { query: INVOICE_TEMPLATES },
  result: { data: { financeSettings: { __typename: 'FinanceSettings', invoice_templates: templates } } },
  maxUsageCount: 20,
});

export const invoiceTemplatesNullSettingsMock = (): MockedResponse => ({
  request: { query: INVOICE_TEMPLATES },
  result: { data: { financeSettings: null } },
  maxUsageCount: 20,
});

export const invoiceTemplatesLoadingMock = (): MockedResponse => ({
  request: { query: INVOICE_TEMPLATES },
  result: {
    data: { financeSettings: { __typename: 'FinanceSettings', invoice_templates: makeInvoiceTemplates() } },
  },
  delay: 60_000,
});

export const updateInvoiceTemplateMock = (
  over: { fail?: boolean; delay?: number } = {},
): MockedResponse => ({
  request: { query: UPDATE_INVOICE_TEMPLATE },
  variableMatcher: () => true,
  ...(over.delay ? { delay: over.delay } : {}),
  ...(over.fail
    ? { error: new Error('tmpl err') }
    : {
        result: {
          data: {
            updateFinanceSettings: {
              __typename: 'FinanceSettings',
              invoice_templates: makeInvoiceTemplates(),
            },
          },
        },
      }),
});
