import { gql } from '@apollo/client';
import type { AppBuildArtifact, CrmAppDownloadBuild } from '@duncit/gql-types';

/** One stored file of a build: the APK or AAB on Android, the IPA on iOS. */
export type CrmAppArtifact = Pick<AppBuildArtifact, 'kind' | 'url' | 'size_mb'>;

/** One downloadable Duncit CRM build (CrmAppDownloadBuild), as the Download page selects it. */
export type CrmAppBuild = Pick<
  CrmAppDownloadBuild,
  'build_no' | 'version' | 'build_number' | 'platform' | 'app_env' | 'created_at'
> & { artifacts: CrmAppArtifact[] };

export interface CrmAppDownloadData {
  crmAppDownload: {
    production: CrmAppBuild | null;
    staging: CrmAppBuild | null;
    ios_production: CrmAppBuild | null;
    ios_staging: CrmAppBuild | null;
  };
}

const BUILD_FIELDS = 'build_no version build_number platform app_env created_at artifacts { kind url size_mb }';

/** The newest Duncit CRM Android and iPhone builds per environment, for the Download app page. */
export const CRM_APP_DOWNLOAD = gql`
  query CrmAppDownload {
    crmAppDownload {
      production { ${BUILD_FIELDS} }
      staging { ${BUILD_FIELDS} }
      ios_production { ${BUILD_FIELDS} }
      ios_staging { ${BUILD_FIELDS} }
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
