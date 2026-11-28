import { gql } from '@apollo/client';
import { HR_SETTINGS_SELECTION, type HrSettingsRecord } from '@duncit/utils';
import type { HrSettingsInput } from '@duncit/gql-types';

export const HR_SETTINGS = gql`
  query HrSettings {
    hrSettings {
      ${HR_SETTINGS_SELECTION}
    }
  }
`;

export const UPDATE_HR_SETTINGS = gql`
  mutation UpdateHrSettings($input: HrSettingsInput!) {
    updateHrSettings(input: $input) {
      ${HR_SETTINGS_SELECTION}
    }
  }
`;

export type SettingsData = { hrSettings: HrSettingsRecord };
export type UpdateSettingsData = { updateHrSettings: HrSettingsRecord };
export type UpdateSettingsVars = { input: HrSettingsInput };
