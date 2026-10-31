import { gql } from '@apollo/client';
import type { SocialCommentRow, SocialPlatform } from '../social-accounts-page/queries';

export type SocialInboxStatus = 'OPEN' | 'REPLIED' | 'DONE' | 'SPAM';
export type SocialInboxView = 'OPEN' | 'FLAGGED' | 'UNASSIGNED' | 'MINE' | 'ALL';

export interface SocialCommentReply {
  at: string | null;
  by_user_id: string;
  by_name: string;
  text: string;
  external_id: string;
  ok: boolean;
  error: string;
}

/** A comment as the Inbox shows it: the Monitoring row plus who is on it and what was said back. */
export interface InboxComment extends SocialCommentRow {
  status: SocialInboxStatus;
  assigned_user_id: string | null;
  assigned_name: string | null;
  replies: SocialCommentReply[];
  last_activity_at: string | null;
}

export interface SocialInboxSummary {
  open: number;
  flagged: number;
  unassigned: number;
  mine: number;
}

export interface SocialReplyCapability {
  platform: SocialPlatform;
  can_reply: boolean;
  missing_permission: string | null;
  max_length: number;
}

export interface InboxAccount {
  id: string;
  name: string;
  platform: SocialPlatform;
}

const INBOX_FIELDS = gql`
  fragment InboxCommentFields on SocialComment {
    id
    account_id
    account_name
    platform
    post_text
    post_permalink
    permalink
    author_name
    author_handle
    text
    published_at
    likes
    ai_status
    ai_sentiment
    ai_categories
    ai_severity
    ai_reason
    review_status
    status
    assigned_user_id
    assigned_name
    replies {
      at
      by_user_id
      by_name
      text
      external_id
      ok
      error
    }
    last_activity_at
  }
`;

export const SOCIAL_INBOX_TABLE = gql`
  query SocialInboxTable($query: TableQueryInput, $view: SocialInboxView) {
    socialInboxTable(query: $query, view: $view) {
      rows {
        ...InboxCommentFields
      }
      total
      page
      page_size
    }
  }
  ${INBOX_FIELDS}
`;

export const SOCIAL_INBOX_SUMMARY = gql`
  query SocialInboxSummary {
    socialInboxSummary {
      open
      flagged
      unassigned
      mine
    }
  }
`;

/** The accounts for the account filter and what each network lets this integration answer — one request. */
export const SOCIAL_INBOX_SETUP = gql`
  query SocialInboxSetup {
    socialAccounts {
      id
      name
      platform
    }
    socialReplyCapabilities {
      platform
      can_reply
      missing_permission
      max_length
    }
  }
`;

export const ASSIGN_SOCIAL_COMMENT = gql`
  mutation AssignSocialComment($id: ID!, $user_id: ID) {
    assignSocialComment(id: $id, user_id: $user_id) {
      ...InboxCommentFields
    }
  }
  ${INBOX_FIELDS}
`;

export const SET_SOCIAL_COMMENT_STATUS = gql`
  mutation SetSocialCommentStatus($id: ID!, $status: SocialInboxStatus!) {
    setSocialCommentStatus(id: $id, status: $status) {
      ...InboxCommentFields
    }
  }
  ${INBOX_FIELDS}
`;

export const SUGGEST_SOCIAL_REPLY = gql`
  mutation SuggestSocialReply($id: ID!) {
    suggestSocialReply(id: $id) {
      text
      run_id
    }
  }
`;

export const REPLY_TO_SOCIAL_COMMENT = gql`
  mutation ReplyToSocialComment($id: ID!, $text: String!) {
    replyToSocialComment(id: $id, text: $text) {
      ...InboxCommentFields
    }
  }
  ${INBOX_FIELDS}
`;
