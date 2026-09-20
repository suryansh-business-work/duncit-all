import { gql } from '@apollo/client';

export type ReleaseStore = 'APP_STORE' | 'GOOGLE_PLAY';
export type StoreReleaseStatus =
  | 'PREPARING'
  | 'WAITING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'LIVE'
  | 'TESTING'
  | 'ROLLING_OUT'
  | 'HALTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'REPLACED'
  | 'REMOVED'
  | 'OTHER';
export type ReleaseIssueKind = 'REJECTION' | 'AWAITING_RELEASE';
export type ReleaseIssueSource = 'STORE' | 'MANUAL';

export const RELEASE_STORES: readonly ReleaseStore[] = ['APP_STORE', 'GOOGLE_PLAY'];

export interface StoreReleaseAdvice {
  summary: string;
  causes: string[];
  steps: string[];
  next_time: string[];
  confidence: string;
  model: string;
  generated_at: string | null;
  /** Why there is no advice, when OpenAI could not answer. */
  error: string;
}

/** One moment a release needed a person — kept after the store has moved on. */
export interface StoreReleaseIssue {
  id: string;
  store: ReleaseStore;
  kind: ReleaseIssueKind;
  source: ReleaseIssueSource;
  version: string;
  build_number: string;
  state: string;
  review_state: string;
  reviewer_message: string;
  store_ref: string;
  detected_at: string;
  detected_by: string;
  resolved_at: string | null;
  resolved_reason: string;
  advice: StoreReleaseAdvice | null;
  notified_at: string | null;
  notify_error: string;
  reminder_count: number;
  last_reminded_at: string | null;
  resubmitted_build_no: string;
  resubmitted_by: string;
  resubmitted_at: string | null;
}

/** One release as the store shows it now, with this server's issue for it when there is one. */
export interface StoreReleaseRow {
  id: string;
  store: ReleaseStore;
  version: string;
  build_number: string;
  state: string;
  status: StoreReleaseStatus;
  track: string;
  review_state: string;
  created_at: string | null;
  submitted_at: string | null;
  rollout_pct: number | null;
  store_ref: string;
  build_no: string;
  issue: StoreReleaseIssue | null;
}

export interface StoreReleasePage {
  store: ReleaseStore;
  rows: StoreReleaseRow[];
  fetched_at: string;
  store_url: string;
  app_name: string;
  configured: boolean;
  error: string;
}

export interface StoreReleaseSettings {
  notify_enabled: boolean;
  slack_channel: string;
  mail_to: string[];
  reminders_enabled: boolean;
  reminder_hours: number;
  updated_by: string;
  updated_at: string | null;
}

/** The store's word as the table shows it: METADATA_REJECTED → "Metadata rejected"; production/completed stays. */
export const humanState = (state: string): string => {
  if (!/^[A-Z_]+$/.test(state)) return state;
  const words = state.toLowerCase().replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** An issue that still needs someone. */
export const isOpen = (issue: StoreReleaseIssue | null): issue is StoreReleaseIssue =>
  issue !== null && issue.resolved_at === null;

const ISSUE_FIELDS = `
  id
  store
  kind
  source
  version
  build_number
  state
  review_state
  reviewer_message
  store_ref
  detected_at
  detected_by
  resolved_at
  resolved_reason
  advice {
    summary
    causes
    steps
    next_time
    confidence
    model
    generated_at
    error
  }
  notified_at
  notify_error
  reminder_count
  last_reminded_at
  resubmitted_build_no
  resubmitted_by
  resubmitted_at
`;

export const STORE_RELEASES = gql`
  query StoreReleases($store: ReleaseStore!) {
    storeReleases(store: $store) {
      store
      fetched_at
      store_url
      app_name
      configured
      error
      rows {
        id
        store
        version
        build_number
        state
        status
        track
        review_state
        created_at
        submitted_at
        rollout_pct
        store_ref
        build_no
        issue { ${ISSUE_FIELDS} }
      }
    }
  }
`;

export const STORE_RELEASE_SETTINGS = gql`
  query StoreReleaseSettings {
    storeReleaseSettings {
      notify_enabled
      slack_channel
      mail_to
      reminders_enabled
      reminder_hours
      updated_by
      updated_at
    }
  }
`;

export const UPDATE_STORE_RELEASE_SETTINGS = gql`
  mutation UpdateStoreReleaseSettings($input: UpdateStoreReleaseSettingsInput!) {
    updateStoreReleaseSettings(input: $input) {
      notify_enabled
      slack_channel
      mail_to
      reminders_enabled
      reminder_hours
      updated_by
      updated_at
    }
  }
`;

export const LOG_STORE_REJECTION = gql`
  mutation LogStoreRejection($input: LogStoreRejectionInput!) {
    logStoreRejection(input: $input) { ${ISSUE_FIELDS} }
  }
`;

export const SET_STORE_ISSUE_REVIEWER_MESSAGE = gql`
  mutation SetStoreIssueReviewerMessage($id: ID!, $message: String!) {
    setStoreIssueReviewerMessage(id: $id, message: $message) { ${ISSUE_FIELDS} }
  }
`;

export const RESOLVE_STORE_ISSUE = gql`
  mutation ResolveStoreIssue($id: ID!) {
    resolveStoreIssue(id: $id) { ${ISSUE_FIELDS} }
  }
`;

export const SUBMIT_LATEST_BUILD_TO_STORE = gql`
  mutation SubmitLatestBuildToStore($store: ReleaseStore!) {
    submitLatestBuildToStore(store: $store) {
      id
      build_no
      version
      build_number
    }
  }
`;
