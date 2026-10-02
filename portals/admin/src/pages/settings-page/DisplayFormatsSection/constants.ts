import { gql } from '@apollo/client';

export const APP_SETTINGS_FORMATS = gql`
  query AppSettingsFormats {
    appSettings {
      date_format
      time_format
      updated_at
    }
  }
`;

export const UPDATE = gql`
  mutation UpdateAppSettingsFormats($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      date_format
      time_format
      updated_at
    }
  }
`;

export const DATE_PRESETS = [
  'dd MMM yyyy',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'EEE, dd MMM yyyy',
];
export const TIME_PRESETS = ['hh:mm a', 'HH:mm', 'h:mm a', 'HH:mm:ss'];
