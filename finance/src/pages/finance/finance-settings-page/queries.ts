import { gql } from '@apollo/client';

export const FINANCE_SETTINGS = gql`
  query FinanceSettings {
    financeSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      invoice_prefix
      dummy_mode
      business_name
      business_address
      business_gstin
      updated_at
    }
  }
`;

export const UPDATE_FINANCE_SETTINGS = gql`
  mutation UpdateFinanceSettings($input: UpdateFinanceSettingsInput!) {
    updateFinanceSettings(input: $input) {
      platform_fee_pct
      gst_pct
      updated_at
    }
  }
`;

export const PREVIEW_AMOUNT = 1000;
