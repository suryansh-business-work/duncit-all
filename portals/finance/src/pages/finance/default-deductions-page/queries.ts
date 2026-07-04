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

export const OVERRIDE_HOSTS = gql`
  query OverrideHosts {
    publicHosts {
      id
      user_id
      full_name
      email
    }
  }
`;

export const OVERRIDE_VENUES = gql`
  query OverrideVenues {
    publicVenues {
      id
      venue_name
      city
      venue_share_pct
      venue_commission_pct
    }
  }
`;

export const SET_HOST_DEDUCTIONS = gql`
  mutation SetHostDeductions($user_id: ID!, $host_commission_pct: Float!) {
    setHostDeductions(user_id: $user_id, host_commission_pct: $host_commission_pct)
  }
`;

export const SET_VENUE_DEDUCTIONS = gql`
  mutation SetVenueDeductions($id: ID!, $venue_share_pct: Float!, $venue_commission_pct: Float!) {
    setVenueDeductions(venue_doc_id: $id, venue_share_pct: $venue_share_pct, venue_commission_pct: $venue_commission_pct) {
      id
      venue_share_pct
      venue_commission_pct
    }
  }
`;
