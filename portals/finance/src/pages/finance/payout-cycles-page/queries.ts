import { gql } from '@apollo/client';

export const PAYOUT_SETTINGS = gql`
  query PayoutSettings {
    financeSettings {
      venue_payout_mode
      host_payout_mode
      payout_day_of_week
      payout_time
      updated_at
    }
  }
`;

export const UPDATE_PAYOUT_SETTINGS = gql`
  mutation UpdatePayoutSettings($input: UpdateFinanceSettingsInput!) {
    updateFinanceSettings(input: $input) {
      venue_payout_mode
      host_payout_mode
      payout_day_of_week
      payout_time
      updated_at
    }
  }
`;

export const PAYOUT_MODES = [
  { value: 'IMMEDIATE', label: 'Immediately (on approval)' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTH_END', label: 'Month end' },
];

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
