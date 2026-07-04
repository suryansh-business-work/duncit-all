import { gql } from '@apollo/client';

export const DEDUCTION_SETTINGS = gql`
  query DeductionSettings {
    financeSettings {
      gst_pct
      platform_fee_pct
      default_host_commission_pct
      default_venue_commission_pct
      default_product_commission_pct
      updated_at
    }
  }
`;

export const UPDATE_DEDUCTIONS = gql`
  mutation UpdateDeductions($input: UpdateFinanceSettingsInput!) {
    updateFinanceSettings(input: $input) {
      gst_pct
      platform_fee_pct
      default_host_commission_pct
      default_venue_commission_pct
      default_product_commission_pct
      updated_at
    }
  }
`;
