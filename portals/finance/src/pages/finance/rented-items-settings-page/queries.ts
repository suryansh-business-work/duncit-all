import { gql } from '@apollo/client';

const RENTAL_SETTINGS_FIELDS = `
  enabled
  terms_html
  commission_pct
  rent_refundable_on_backout
  deposit_refundable
  booking_cutoff_hours
  deposit_auto_release_days
  updated_at
`;

export const RENTAL_SETTINGS = gql`
  query RentalSettings {
    rentalSettings { ${RENTAL_SETTINGS_FIELDS} }
  }
`;

export const UPDATE_RENTAL_SETTINGS = gql`
  mutation UpdateRentalSettings($input: RentalSettingsInput!) {
    updateRentalSettings(input: $input) { ${RENTAL_SETTINGS_FIELDS} }
  }
`;

export interface RentalSettings {
  enabled: boolean;
  terms_html: string;
  commission_pct: number;
  rent_refundable_on_backout: boolean;
  deposit_refundable: boolean;
  booking_cutoff_hours: number;
  deposit_auto_release_days: number;
  updated_at: string | null;
}

export type RentalSettingsInput = Omit<RentalSettings, 'updated_at'>;

export interface RentalSettingsData {
  rentalSettings: RentalSettings;
}

export interface UpdateRentalSettingsData {
  updateRentalSettings: RentalSettings;
}

export interface UpdateRentalSettingsVars {
  input: RentalSettingsInput;
}
