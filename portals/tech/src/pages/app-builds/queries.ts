import { gql } from '@apollo/client';

export type AppBuildPlatform = 'ANDROID' | 'IOS';
export type AppBuildStatus = 'SUCCESS' | 'FAILED';

export interface AppBuildCommit {
  hash: string;
  subject: string;
  author: string;
}

export interface AppBuildRow {
  id: string;
  build_no: string;
  platform: AppBuildPlatform;
  status: AppBuildStatus;
  version: string;
  build_name: string;
  artifact_url: string;
  size_mb: number | null;
  commit_sha: string;
  branch: string;
  commits: AppBuildCommit[];
  files_changed: number | null;
  insertions: number | null;
  deletions: number | null;
  workflow_run_url: string;
  duration_seconds: number | null;
  reported_by: string;
  slack_channel: string | null;
  slack_ts: string | null;
  slack_error: string | null;
  created_at: string | null;
}

export interface AppBuildSettings {
  android_channel: string | null;
  ios_channel: string | null;
  last_reported_at: string | null;
  last_reported_by: string | null;
}

export interface AppBuildCiToken {
  token: string;
  secret_name: string;
  issued_for: string;
}

export const APP_BUILDS_TABLE = gql`
  query AppBuildsTable($platform: AppBuildPlatform!, $query: TableQueryInput) {
    appBuildsTable(platform: $platform, query: $query) {
      total
      rows {
        id
        build_no
        platform
        status
        version
        build_name
        artifact_url
        size_mb
        commit_sha
        branch
        commits {
          hash
          subject
          author
        }
        files_changed
        insertions
        deletions
        workflow_run_url
        duration_seconds
        reported_by
        slack_channel
        slack_ts
        slack_error
        created_at
      }
    }
  }
`;

export const APP_BUILD_SETTINGS = gql`
  query AppBuildSettings {
    appBuildSettings {
      android_channel
      ios_channel
      last_reported_at
      last_reported_by
    }
  }
`;

export const UPDATE_APP_BUILD_SETTINGS = gql`
  mutation UpdateAppBuildSettings($input: UpdateAppBuildSettingsInput!) {
    updateAppBuildSettings(input: $input) {
      android_channel
      ios_channel
      last_reported_at
      last_reported_by
    }
  }
`;

export const ISSUE_APP_BUILD_CI_TOKEN = gql`
  mutation IssueAppBuildCiToken {
    issueAppBuildCiToken {
      token
      secret_name
      issued_for
    }
  }
`;

/** ImageKit serves the file inline by default; this forces a download. */
export const downloadUrl = (row: Pick<AppBuildRow, 'artifact_url'>): string =>
  row.artifact_url ? `${row.artifact_url}?ik-attachment=true` : '';

/** `+12 / -34 (5 files)` — or an em-dash when the range was unknown. */
export const changesLabel = (row: AppBuildRow): string => {
  if (row.files_changed == null) return '—';
  return `+${row.insertions ?? 0} / -${row.deletions ?? 0} (${row.files_changed} files)`;
};

/** `4m 32s` from seconds. */
export const durationLabel = (row: AppBuildRow): string => {
  if (row.duration_seconds == null) return '—';
  const minutes = Math.floor(row.duration_seconds / 60);
  const seconds = row.duration_seconds % 60;
  return `${minutes}m ${seconds}s`;
};
