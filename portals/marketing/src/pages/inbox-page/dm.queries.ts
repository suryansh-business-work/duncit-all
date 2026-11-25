import { gql } from '@apollo/client';
import type { SocialPlatform, SocialSentiment, SocialSeverity } from '../social-accounts-page/queries';
import type { SocialInboxStatus } from './queries';

/** The Inbox's channel tabs, as the `?channel=` URL names them. */
export type InboxChannel = 'all' | 'dms' | 'comments' | 'threads';
export type SocialWindowState = 'OPEN' | 'HUMAN_AGENT' | 'CLOSED';
export type SocialInboxItemKind = 'COMMENT' | 'THREADS_REPLY' | 'DM';

export interface SocialConversation {
  id: string;
  account_id: string;
  account_name: string;
  platform: SocialPlatform;
  participant: { username: string; name: string; avatar_url: string };
  last_message_at: string | null;
  last_inbound_at: string | null;
  last_message_text: string;
  unread_count: number;
  status: SocialInboxStatus;
  assigned_user_id: string | null;
  assigned_name: string | null;
  ai_sentiment: SocialSentiment | null;
  ai_severity: SocialSeverity | null;
  opted_out: boolean;
  ig_lead_id: string | null;
  marketing_lead_id: string | null;
  window_state: SocialWindowState;
  window_closes_at: string | null;
}

export interface SocialMessage {
  id: string;
  direction: 'IN' | 'OUT';
  text: string;
  attachments: { type: string; url: string }[];
  sent_at: string | null;
  status: 'RECEIVED' | 'SENT' | 'FAILED';
  error: string;
  sent_by_name: string;
  automated: boolean;
  tag: string;
}

export interface SocialConversationThread {
  conversation: SocialConversation;
  messages: SocialMessage[];
  missing_permission: string | null;
  max_length: number;
}

export interface SocialInboxItem {
  id: string;
  kind: SocialInboxItemKind;
  platform: SocialPlatform;
  account_id: string;
  account_name: string;
  author: string;
  text: string;
  status: SocialInboxStatus;
  ai_sentiment: SocialSentiment | null;
  ai_severity: SocialSeverity | null;
  assigned_name: string | null;
  at: string | null;
  unread_count: number;
}

const CONVERSATION_FIELDS = gql`
  fragment ConversationFields on SocialConversation {
    id
    account_id
    account_name
    platform
    participant {
      username
      name
      avatar_url
    }
    last_message_at
    last_inbound_at
    last_message_text
    unread_count
    status
    assigned_user_id
    assigned_name
    ai_sentiment
    ai_severity
    opted_out
    ig_lead_id
    marketing_lead_id
    window_state
    window_closes_at
  }
`;

const THREAD_FIELDS = gql`
  fragment ConversationThreadFields on SocialConversationThread {
    conversation {
      ...ConversationFields
    }
    messages {
      id
      direction
      text
      attachments {
        type
        url
      }
      sent_at
      status
      error
      sent_by_name
      automated
      tag
    }
    missing_permission
    max_length
  }
  ${CONVERSATION_FIELDS}
`;

export const SOCIAL_CONVERSATIONS_TABLE = gql`
  query SocialConversationsTable($query: TableQueryInput, $view: SocialInboxView) {
    socialConversationsTable(query: $query, view: $view) {
      rows {
        ...ConversationFields
      }
      total
      page
      page_size
    }
  }
  ${CONVERSATION_FIELDS}
`;

export const SOCIAL_INBOX_ITEMS_TABLE = gql`
  query SocialInboxItemsTable($query: TableQueryInput, $view: SocialInboxView) {
    socialInboxItemsTable(query: $query, view: $view) {
      rows {
        id
        kind
        platform
        account_id
        account_name
        author
        text
        status
        ai_sentiment
        ai_severity
        assigned_name
        at
        unread_count
      }
      total
      page
      page_size
    }
  }
`;

export const SOCIAL_DM_SUMMARY = gql`
  query SocialDmSummary {
    socialDmSummary {
      open
      flagged
      unassigned
      mine
    }
  }
`;

export const SOCIAL_CONVERSATION = gql`
  query SocialConversation($id: ID!) {
    socialConversation(id: $id) {
      ...ConversationThreadFields
    }
  }
  ${THREAD_FIELDS}
`;

export const MARK_SOCIAL_CONVERSATION_READ = gql`
  mutation MarkSocialConversationRead($id: ID!) {
    markSocialConversationRead(id: $id) {
      ...ConversationThreadFields
    }
  }
  ${THREAD_FIELDS}
`;

export const SEND_SOCIAL_MESSAGE = gql`
  mutation SendSocialMessage($id: ID!, $text: String!) {
    sendSocialMessage(id: $id, text: $text) {
      ...ConversationThreadFields
    }
  }
  ${THREAD_FIELDS}
`;

export const SUGGEST_SOCIAL_MESSAGE = gql`
  mutation SuggestSocialMessage($id: ID!) {
    suggestSocialMessage(id: $id) {
      text
      run_id
    }
  }
`;

export const ASSIGN_SOCIAL_CONVERSATION = gql`
  mutation AssignSocialConversation($id: ID!, $user_id: ID) {
    assignSocialConversation(id: $id, user_id: $user_id) {
      ...ConversationThreadFields
    }
  }
  ${THREAD_FIELDS}
`;

export const SET_SOCIAL_CONVERSATION_STATUS = gql`
  mutation SetSocialConversationStatus($id: ID!, $status: SocialInboxStatus!) {
    setSocialConversationStatus(id: $id, status: $status) {
      ...ConversationThreadFields
    }
  }
  ${THREAD_FIELDS}
`;

export const CREATE_LEAD_FROM_SOCIAL_CONVERSATION = gql`
  mutation CreateLeadFromSocialConversation($id: ID!) {
    createLeadFromSocialConversation(id: $id) {
      lead_id
      merged
      thread {
        ...ConversationThreadFields
      }
    }
  }
  ${THREAD_FIELDS}
`;
