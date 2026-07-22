import { gql } from '@apollo/client';

export const TELEMETRY_SETTINGS = gql`
  query TelemetrySettings {
    telemetrySettings {
      signoz_enabled
      persisted_levels
      retention_days
      updated_at
    }
  }
`;

export const UPDATE_TELEMETRY_SETTINGS = gql`
  mutation UpdateTelemetrySettings($input: UpdateTelemetrySettingsInput!) {
    updateTelemetrySettings(input: $input) {
      signoz_enabled
      persisted_levels
      retention_days
      updated_at
    }
  }
`;

export interface TelemetrySettings {
  signoz_enabled: boolean;
  persisted_levels: string[];
  retention_days: number;
  updated_at: string | null;
}

export const LEVELS = ['error', 'warn', 'info', 'debug'] as const;
