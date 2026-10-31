import { gql } from '@apollo/client';

export type IgLeadStatus = 'NEW' | 'CONTACTED' | 'REPLIED' | 'CONVERTED' | 'LOST';
export type IgLeadSearchStatus = 'RUNNING' | 'DONE' | 'FAILED';

export interface IgLeadMessage {
  step: number;
  text: string;
  sent_at: string | null;
}

export interface IgLead {
  id: string;
  username: string;
  name: string;
  bio: string;
  website: string;
  followers: number | null;
  media_count: number | null;
  profile_picture_url: string;
  profile_url: string;
  emails: string[];
  phones: string[];
  fit_score: number | null;
  fit_reason: string;
  status: IgLeadStatus;
  draft: string;
  draft_step: number | null;
  messages: IgLeadMessage[];
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  created_at: string | null;
}

export interface IgLeadSearch {
  id: string;
  brief: string;
  summary: string;
  queries: string[];
  status: IgLeadSearchStatus;
  found: number;
  added: number;
  skipped: number;
  error: string;
  created_at: string | null;
}

export interface IgLeadSettings {
  max_follow_ups: number;
  follow_up_gap_days: number;
  daily_send_limit: number;
  pitch: string;
  sent_today: number;
  serper_ready: boolean;
  instagram_ready: boolean;
}

const LEAD_FIELDS = gql`
  fragment IgLeadFields on IgLead {
    id
    username
    name
    bio
    website
    followers
    media_count
    profile_picture_url
    profile_url
    emails
    phones
    fit_score
    fit_reason
    status
    draft
    draft_step
    messages {
      step
      text
      sent_at
    }
    next_follow_up_at
    last_contacted_at
    created_at
  }
`;

const SETTINGS_FIELDS = gql`
  fragment IgLeadSettingsFields on IgLeadSettings {
    max_follow_ups
    follow_up_gap_days
    daily_send_limit
    pitch
    sent_today
    serper_ready
    instagram_ready
  }
`;

const SEARCH_FIELDS = gql`
  fragment IgLeadSearchFields on IgLeadSearch {
    id
    brief
    summary
    queries
    status
    found
    added
    skipped
    error
    created_at
  }
`;

export const IG_LEADS_TABLE = gql`
  ${LEAD_FIELDS}
  query IgLeadsTable($query: TableQueryInput, $due: Boolean) {
    igLeadsTable(query: $query, due: $due) {
      rows {
        ...IgLeadFields
      }
      total
      page
      page_size
    }
  }
`;

export const IG_LEAD_SEARCHES = gql`
  ${SEARCH_FIELDS}
  query IgLeadSearches {
    igLeadSearches {
      ...IgLeadSearchFields
    }
  }
`;

export const IG_LEAD_SETTINGS = gql`
  ${SETTINGS_FIELDS}
  query IgLeadSettings {
    igLeadSettings {
      ...IgLeadSettingsFields
    }
  }
`;

export const START_IG_LEAD_SEARCH = gql`
  ${SEARCH_FIELDS}
  mutation StartIgLeadSearch($input: IgLeadSearchInput!) {
    startIgLeadSearch(input: $input) {
      ...IgLeadSearchFields
    }
  }
`;

export const DRAFT_IG_LEAD_MESSAGE = gql`
  ${LEAD_FIELDS}
  mutation DraftIgLeadMessage($id: ID!) {
    draftIgLeadMessage(id: $id) {
      ...IgLeadFields
    }
  }
`;

export const MARK_IG_LEAD_SENT = gql`
  ${LEAD_FIELDS}
  mutation MarkIgLeadSent($id: ID!, $text: String!) {
    markIgLeadSent(id: $id, text: $text) {
      ...IgLeadFields
    }
  }
`;

export const SET_IG_LEAD_STATUS = gql`
  ${LEAD_FIELDS}
  mutation SetIgLeadStatus($id: ID!, $status: IgLeadStatus!) {
    setIgLeadStatus(id: $id, status: $status) {
      ...IgLeadFields
    }
  }
`;

export const DELETE_IG_LEAD = gql`
  mutation DeleteIgLead($id: ID!) {
    deleteIgLead(id: $id)
  }
`;

export const UPDATE_IG_LEAD_SETTINGS = gql`
  ${SETTINGS_FIELDS}
  mutation UpdateIgLeadSettings($input: IgLeadSettingsInput!) {
    updateIgLeadSettings(input: $input) {
      ...IgLeadSettingsFields
    }
  }
`;
