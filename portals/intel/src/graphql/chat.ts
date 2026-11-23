import { gql } from '@apollo/client';
import type { IntelBootstrap, IntelConversation, IntelConversationCounts, IntelConversationPage, IntelMessage, IntelSendResult } from '@duncit/gql-types';

/** Chat documents. Fragments keep every list and detail selecting the same fields. */

export const CONVERSATION_FIELDS = gql`
  fragment IntelConversationFields on IntelConversation {
    id
    title
    pinned
    archived
    model
    environment
    sources
    message_count
    last_message_at
    created_at
    updated_at
  }
`;

export const MESSAGE_FIELDS = gql`
  fragment IntelMessageFields on IntelMessage {
    id
    conversation_id
    role
    content
    status
    model
    error_code
    error_message
    edited
    approval_ids
    created_at
    citations {
      ref
      title
      url
      source
      environment
      snippet
      page
      line_start
      line_end
    }
    tool_calls {
      name
      title
      status
      summary
    }
  }
`;

export const INTEL_BOOTSTRAP = gql`
  query IntelBootstrap {
    intelBootstrap {
      app_title
      description
      default_environment
      default_model
      pending_approvals
      upload_max_mb
      upload_types
      me {
        user_id
        level
        can_admin
        can_super
        environments
        sources
        can_request_writes
      }
      models {
        id
        label
        enabled
        is_default
      }
      sources {
        source
        state
        connectors
        indexed
        last_sync_at
        detail
      }
    }
  }
`;

export const INTEL_CONVERSATIONS = gql`
  query IntelConversations($view: String, $sort: String, $search: String, $page: Int, $page_size: Int) {
    intelConversations(view: $view, sort: $sort, search: $search, page: $page, page_size: $page_size) {
      total
      rows {
        ...IntelConversationFields
      }
    }
  }
  ${CONVERSATION_FIELDS}
`;

export const INTEL_COUNTS = gql`
  query IntelConversationCounts {
    intelConversationCounts {
      recent
      pinned
      archived
      all
    }
  }
`;

export const INTEL_THREAD = gql`
  query IntelThread($id: ID!) {
    intelConversation(id: $id) {
      ...IntelConversationFields
    }
    intelMessages(conversation_id: $id) {
      ...IntelMessageFields
    }
  }
  ${CONVERSATION_FIELDS}
  ${MESSAGE_FIELDS}
`;

export const INTEL_SEND = gql`
  mutation IntelSend($input: IntelSendInput!) {
    intelSend(input: $input) {
      conversation_id
      user_message_id
      assistant_message_id
    }
  }
`;

export const INTEL_STOP = gql`
  mutation IntelStop($message_id: ID!) {
    intelStop(message_id: $message_id)
  }
`;

export const INTEL_UPDATE_CONVERSATION = gql`
  mutation IntelUpdateConversation($id: ID!, $patch: IntelConversationPatch!) {
    intelUpdateConversation(id: $id, patch: $patch) {
      ...IntelConversationFields
    }
  }
  ${CONVERSATION_FIELDS}
`;

export const INTEL_DELETE_CONVERSATION = gql`
  mutation IntelDeleteConversation($id: ID!) {
    intelDeleteConversation(id: $id)
  }
`;

export const INTEL_SESSION_START = gql`
  mutation IntelSessionStart {
    intelSessionStart
  }
`;

export interface BootstrapData {
  intelBootstrap: IntelBootstrap;
}
export interface ConversationsData {
  intelConversations: IntelConversationPage;
}
export interface CountsData {
  intelConversationCounts: IntelConversationCounts;
}
export interface ThreadData {
  intelConversation: IntelConversation;
  intelMessages: IntelMessage[];
}
export interface SendData {
  intelSend: IntelSendResult;
}
