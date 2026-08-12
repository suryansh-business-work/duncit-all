import { gql } from '@apollo/client';

export type AppBuildPlatform = 'ANDROID' | 'IOS';
export type AppBuildStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';
export type AppBuildArtifactKind = 'APK' | 'AAB' | 'IPA';

export interface AppBuildCommit {
  hash: string;
  subject: string;
  author: string;
}

/** One file a build produced — Android makes an APK and an AAB from one compile. */
export interface AppBuildArtifact {
  kind: AppBuildArtifactKind;
  name: string;
  url: string;
  file_id: string;
  size_mb: number | null;
  /** Why this one is missing. Empty whenever there is a url. */
  error: string;
}

export interface AppBuildRow {
  id: string;
  build_no: string;
  platform: AppBuildPlatform;
  status: AppBuildStatus;
  version: string;
  artifacts: AppBuildArtifact[];
  build_name: string;
  artifact_url: string;
  /** Why a SUCCESS build has no download. Empty whenever there is one. */
  artifact_error: string;
  /** Why a FAILED build failed — the stage that broke. Empty otherwise. */
  error_message: string;
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
        artifacts {
          kind
          name
          url
          file_id
          size_mb
          error
        }
        build_name
        artifact_url
        artifact_error
        error_message
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

export const DELETE_APP_BUILD = gql`
  mutation DeleteAppBuild($id: ID!) {
    deleteAppBuild(id: $id)
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

/**
 * The longest a build workflow can run — the larger `timeout-minutes` of the
 * two, plus slack.
 *
 * A RUNNING row older than this cannot still be running: the runner was
 * cancelled or killed, so nothing was left to report the outcome. Spinning
 * forever claims a build is alive when it is not; saying so is honest.
 */
const MAX_BUILD_MINUTES = 130;

export const isStaleRunning = (row: AppBuildRow): boolean => {
  if (row.status !== 'RUNNING' || !row.created_at) return false;
  return Date.now() - new Date(row.created_at).getTime() > MAX_BUILD_MINUTES * 60_000;
};

/**
 * Whole minutes a live build has been going.
 *
 * Derived on the client from created_at, so it advances on its own between
 * polls — unlike anything the runner could report, which would be as old as
 * the last report that carried it.
 */
export const runningMinutes = (row: AppBuildRow): number => {
  if (!row.created_at) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 60_000));
};

/** `62.4 MB` for one file; `APK 62.4 MB · AAB 48.1 MB` when a build made several. */
export const sizeLabel = (row: AppBuildRow): string => {
  const sized = row.artifacts.filter((a) => a.size_mb != null);
  if (sized.length === 0) return '—';
  if (sized.length === 1) return `${(sized[0]?.size_mb ?? 0).toFixed(1)} MB`;
  return sized.map((a) => `${a.kind} ${(a.size_mb ?? 0).toFixed(1)} MB`).join(' · ');
};

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
