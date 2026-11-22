import { gql } from '@apollo/client';
import type { AskDuncitActionView, AskDuncitMessageView } from '@duncit/utils';

/** Ask Duncit operations — only the fields this screen renders. */

const ACTION_FIELDS = gql`
  fragment MwebAskDuncitAction on AskDuncitAction {
    id
    tool
    tool_title
    risk
    args_preview
    status
    error_message
    can_rollback
    expires_at
  }
`;

const MESSAGE_FIELDS = gql`
  fragment MwebAskDuncitMessage on AskDuncitMessage {
    id
    role
    content
    status
    attachments {
      url
      kind
      name
    }
    tool_calls {
      name
      title
      status
      action_id
    }
    actions {
      ...MwebAskDuncitAction
    }
    knowledge_refs {
      id
      title
    }
    feedback_rating
    low_confidence
    out_of_context
    error_code
    created_at
  }
  ${ACTION_FIELDS}
`;

export const ASK_DUNCIT_BOOTSTRAP = gql`
  query MwebAskDuncitBootstrap($role: String, $page: AskDuncitPageInput) {
    askDuncitBootstrap(role: $role, page: $page, surface: MWEB) {
      available
      unavailable_reason
      role_key
      can_write
      features {
        voice
        uploads
        memory
        proactive_alerts
        rollback
        handover
        chat_history
      }
      suggestions {
        id
        label_key
        label
      }
      alerts {
        id
        severity
        label_key
        params
        prompt_key
      }
      limits {
        max_input_chars
        max_attachments
        max_attachment_mb
      }
    }
  }
`;

export const ASK_DUNCIT_CONVERSATIONS = gql`
  query MwebAskDuncitConversations($before: String, $search: String) {
    askDuncitConversations(before: $before, search: $search, limit: 20) {
      items {
        id
        title
        role_key
        status
        last_message_at
      }
      has_more
    }
  }
`;

export const ASK_DUNCIT_MESSAGES = gql`
  query MwebAskDuncitMessages($conversationId: ID!, $before: ID) {
    askDuncitMessages(conversation_id: $conversationId, before: $before, limit: 30) {
      items {
        ...MwebAskDuncitMessage
      }
      has_more
    }
  }
  ${MESSAGE_FIELDS}
`;

export const ASK_DUNCIT_MESSAGE = gql`
  query MwebAskDuncitMessage($id: ID!) {
    askDuncitMessage(id: $id) {
      ...MwebAskDuncitMessage
    }
  }
  ${MESSAGE_FIELDS}
`;

export const ASK_DUNCIT_MEMORY = gql`
  query MwebAskDuncitMemory {
    askDuncitMemory {
      id
      text
    }
  }
`;

export const SEND_ASK_DUNCIT = gql`
  mutation MwebSendAskDuncit($input: AskDuncitSendInput!) {
    sendAskDuncitMessage(input: $input) {
      conversation_id
      user_message_id
      message_id
      role_key
      status
    }
  }
`;

export const STOP_ASK_DUNCIT = gql`
  mutation MwebStopAskDuncit($messageId: ID!) {
    stopAskDuncitMessage(message_id: $messageId)
  }
`;

export const DECIDE_ASK_DUNCIT_ACTION = gql`
  mutation MwebDecideAskDuncitAction($id: ID!, $approve: Boolean!) {
    decideAskDuncitAction(id: $id, approve: $approve, surface: MWEB) {
      ...MwebAskDuncitAction
    }
  }
  ${ACTION_FIELDS}
`;

export const ROLLBACK_ASK_DUNCIT_ACTION = gql`
  mutation MwebRollbackAskDuncitAction($id: ID!) {
    rollbackAskDuncitAction(id: $id, surface: MWEB) {
      ...MwebAskDuncitAction
    }
  }
  ${ACTION_FIELDS}
`;

export const RATE_ASK_DUNCIT = gql`
  mutation MwebRateAskDuncit($messageId: ID!, $rating: String!, $comment: String) {
    rateAskDuncitMessage(message_id: $messageId, rating: $rating, comment: $comment) {
      id
      feedback_rating
    }
  }
`;

export const HANDOVER_ASK_DUNCIT = gql`
  mutation MwebHandoverAskDuncit($conversationId: ID!, $team: String, $summary: String, $role: String) {
    handOverAskDuncitConversation(conversation_id: $conversationId, team: $team, summary: $summary, role: $role, surface: MWEB) {
      ticket_id
      ticket_no
      already
    }
  }
`;

export const DELETE_ASK_DUNCIT_CONVERSATION = gql`
  mutation MwebDeleteAskDuncitConversation($id: ID!) {
    deleteAskDuncitConversation(id: $id)
  }
`;

export const FORGET_ASK_DUNCIT_FACT = gql`
  mutation MwebForgetAskDuncitFact($id: String!) {
    forgetAskDuncitFact(id: $id)
  }
`;

export interface Bootstrap {
  available: boolean;
  unavailable_reason: string | null;
  role_key: string;
  can_write: boolean;
  features: { voice: boolean; uploads: boolean; memory: boolean; proactive_alerts: boolean; rollback: boolean; handover: boolean; chat_history: boolean };
  suggestions: Array<{ id: string; label_key: string | null; label: string | null }>;
  alerts: Array<{ id: string; severity: string; label_key: string; params: string; prompt_key: string }>;
  limits: { max_input_chars: number; max_attachments: number; max_attachment_mb: number };
}

export interface ConversationItem {
  id: string;
  title: string;
  role_key: string;
  status: string;
  last_message_at: string | null;
}

export type Message = AskDuncitMessageView;
export type Action = AskDuncitActionView;

export interface SendResult {
  conversation_id: string;
  user_message_id: string;
  message_id: string;
  role_key: string;
  status: string;
}
