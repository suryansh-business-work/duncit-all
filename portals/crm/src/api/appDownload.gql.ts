import { gql } from '@apollo/client';

/** One downloadable Duncit CRM APK (CrmAppDownloadBuild). */
export interface CrmAppBuild {
  build_no: string;
  version: string;
  build_number: string | null;
  apk_url: string;
  size_mb: number | null;
  app_env: 'PRODUCTION' | 'STAGING';
  created_at: string | null;
}

export interface CrmAppDownloadData {
  crmAppDownload: { production: CrmAppBuild | null; staging: CrmAppBuild | null };
}

const BUILD_FIELDS = 'build_no version build_number apk_url size_mb app_env created_at';

/** The newest Duncit CRM Android app per environment, for the Download app page. */
export const CRM_APP_DOWNLOAD = gql`
  query CrmAppDownload {
    crmAppDownload {
      production { ${BUILD_FIELDS} }
      staging { ${BUILD_FIELDS} }
    }
  }
`;

/** A Slack channel the Duncit bot can see (CrmSlackChannel). */
export interface CrmSlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
}

export interface CrmAppBuildSettings {
  slack_configured: boolean;
  production_channel: string | null;
  staging_channel: string | null;
  channels: CrmSlackChannel[];
  channels_error: string | null;
}

const SETTINGS_FIELDS = 'slack_configured production_channel staging_channel channels { id name is_private is_member } channels_error';

/** Which Slack channel each environment's Duncit CRM build is published to. */
export const CRM_APP_BUILD_SETTINGS = gql`
  query CrmAppBuildSettings {
    crmAppBuildSettings { ${SETTINGS_FIELDS} }
  }
`;

export const UPDATE_CRM_APP_BUILD_SETTINGS = gql`
  mutation UpdateCrmAppBuildSettings($input: UpdateCrmAppBuildSettingsInput!) {
    updateCrmAppBuildSettings(input: $input) { ${SETTINGS_FIELDS} }
  }
`;
