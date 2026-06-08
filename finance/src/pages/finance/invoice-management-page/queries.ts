import { gql } from '@apollo/client';

/** All invoice/ticket branding fields the Invoice Management page maintains. */
export const INVOICE_SETTINGS = gql`
  query InvoiceSettings {
    financeSettings {
      currency_symbol
      invoice_prefix
      business_name
      business_address
      business_gstin
      invoice_label
      invoice_support_email
      invoice_support_phone
      invoice_footer_note
      invoice_terms
      invoice_logo_url
      updated_at
    }
  }
`;

export const UPDATE_INVOICE_SETTINGS = gql`
  mutation UpdateInvoiceSettings($input: UpdateFinanceSettingsInput!) {
    updateFinanceSettings(input: $input) {
      business_name
      invoice_label
      updated_at
    }
  }
`;
