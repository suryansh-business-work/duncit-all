import { gql } from '@apollo/client';
import type {
  CrmLeadAiAction,
  CrmLeadAiContext,
  CrmLeadAiContextSource,
  CrmLeadAiMessage,
  CrmLeadAiReply,
  CrmLeadAiThread,
} from '@duncit/gql-types';

export type AskAiAction = Omit<CrmLeadAiAction, '__typename'>;
export type AskAiMessage = Omit<CrmLeadAiMessage, '__typename' | 'actions'> & { actions: AskAiAction[] };
export type AskAiSource = Omit<CrmLeadAiContextSource, '__typename'>;
export type AskAiContext = Omit<CrmLeadAiContext, '__typename' | 'sources'> & { sources: AskAiSource[] };

const MESSAGE = gql`
  fragment CrmLeadAiMessageFields on CrmLeadAiMessage {
    id
    role
    content
    created_at
    actions {
      type
      status
      to
      subject
      body_html
      reminder_id
      title
      due_at
      notes
      reminder_status
      result_message
    }
  }
`;

const CONTEXT = gql`
  fragment CrmLeadAiContextFields on CrmLeadAiContext {
    total_tokens
    total_chars
    built_at
    sources {
      key
      items
      chars
      tokens
      truncated
    }
  }
`;

export const CRM_LEAD_AI_THREAD = gql`
  query CrmLeadAiThread($entity: CrmEntityType!, $lead_id: ID!) {
    crmLeadAiThread(entity: $entity, lead_id: $lead_id) {
      messages {
        ...CrmLeadAiMessageFields
      }
      context {
        ...CrmLeadAiContextFields
      }
    }
  }
  ${MESSAGE}
  ${CONTEXT}
`;

export const ASK_CRM_LEAD_AI = gql`
  mutation AskCrmLeadAi($entity: CrmEntityType!, $lead_id: ID!, $message: String!) {
    askCrmLeadAi(entity: $entity, lead_id: $lead_id, message: $message) {
      user_message {
        ...CrmLeadAiMessageFields
      }
      assistant_message {
        ...CrmLeadAiMessageFields
      }
      context {
        ...CrmLeadAiContextFields
      }
    }
  }
  ${MESSAGE}
  ${CONTEXT}
`;

export const SET_CRM_LEAD_AI_ACTION_STATUS = gql`
  mutation SetCrmLeadAiActionStatus(
    $entity: CrmEntityType!
    $lead_id: ID!
    $message_id: ID!
    $action_index: Int!
    $status: CrmLeadAiActionStatus!
    $result_message: String
  ) {
    setCrmLeadAiActionStatus(
      entity: $entity
      lead_id: $lead_id
      message_id: $message_id
      action_index: $action_index
      status: $status
      result_message: $result_message
    ) {
      ...CrmLeadAiMessageFields
    }
  }
  ${MESSAGE}
`;

export const CLEAR_CRM_LEAD_AI_THREAD = gql`
  mutation ClearCrmLeadAiThread($entity: CrmEntityType!, $lead_id: ID!) {
    clearCrmLeadAiThread(entity: $entity, lead_id: $lead_id)
  }
`;

export interface CrmLeadAiThreadData {
  crmLeadAiThread: Omit<CrmLeadAiThread, 'messages' | 'context'> & { messages: AskAiMessage[]; context: AskAiContext };
}
export interface AskCrmLeadAiData {
  askCrmLeadAi: Omit<CrmLeadAiReply, 'user_message' | 'assistant_message' | 'context'> & {
    user_message: AskAiMessage;
    assistant_message: AskAiMessage;
    context: AskAiContext;
  };
}
export interface SetCrmLeadAiActionStatusData {
  setCrmLeadAiActionStatus: AskAiMessage;
}
