import { gql } from '@apollo/client';

const TEMPLATE_FIELDS = `
  label
  terms
  footer
  note
`;

export const INVOICE_TEMPLATES = gql`
  query InvoiceTemplates {
    financeSettings {
      invoice_templates {
        venue { ${TEMPLATE_FIELDS} }
        host { ${TEMPLATE_FIELDS} }
        product { ${TEMPLATE_FIELDS} }
      }
    }
  }
`;

export const UPDATE_INVOICE_TEMPLATE = gql`
  mutation UpdateInvoiceTemplate($input: UpdateFinanceSettingsInput!) {
    updateFinanceSettings(input: $input) {
      invoice_templates {
        venue { ${TEMPLATE_FIELDS} }
        host { ${TEMPLATE_FIELDS} }
        product { ${TEMPLATE_FIELDS} }
      }
    }
  }
`;

export type InvoiceKind = 'venue' | 'host' | 'product';

export const KIND_META: Record<InvoiceKind, { title: string; subtitle: string }> = {
  venue: { title: 'Venue Invoice', subtitle: 'Sent to the venue owner when a pod is completed and approved.' },
  host: { title: 'Host Invoice', subtitle: 'Sent to the host when their pod payout is approved.' },
  product: { title: 'Product Invoice', subtitle: 'Sent to each product seller for products sold on a completed pod.' },
};
