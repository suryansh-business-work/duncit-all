import { gql } from '@apollo/client';

/** Ask Duncit — the AI portal's writes. Each returns what the page re-renders from. */

const SETTINGS_ACK = gql`
  fragment AiAskDuncitSettingsAck on AskDuncitSettings {
    enabled
    kill_switch
    kill_switch_reason
    updated_at
  }
`;

export const UPDATE_ASK_DUNCIT_MODEL_SETTINGS = gql`
  mutation AiUpdateAskDuncitModelSettings($input: AskDuncitModelSettingsInput!) {
    updateAskDuncitModelSettings(input: $input) {
      ...AiAskDuncitSettingsAck
    }
  }
  ${SETTINGS_ACK}
`;

export const UPDATE_ASK_DUNCIT_CONTROL = gql`
  mutation AiUpdateAskDuncitControl($input: AskDuncitControlInput!) {
    updateAskDuncitControl(input: $input) {
      ...AiAskDuncitSettingsAck
    }
  }
  ${SETTINGS_ACK}
`;

export const SET_ASK_DUNCIT_KILL_SWITCH = gql`
  mutation AiSetAskDuncitKillSwitch($on: Boolean!, $reason: String, $role: AskDuncitRoleKey) {
    setAskDuncitKillSwitch(on: $on, reason: $reason, role: $role) {
      ...AiAskDuncitSettingsAck
    }
  }
  ${SETTINGS_ACK}
`;

export const UPDATE_ASK_DUNCIT_ROLE_POLICY = gql`
  mutation AiUpdateAskDuncitRolePolicy($role: AskDuncitRoleKey!, $input: AskDuncitRolePolicyInput!) {
    updateAskDuncitRolePolicy(role: $role, input: $input) {
      ...AiAskDuncitSettingsAck
    }
  }
  ${SETTINGS_ACK}
`;

export const RESET_ASK_DUNCIT_ROLE_POLICY = gql`
  mutation AiResetAskDuncitRolePolicy($role: AskDuncitRoleKey!) {
    resetAskDuncitRolePolicy(role: $role) {
      ...AiAskDuncitSettingsAck
    }
  }
  ${SETTINGS_ACK}
`;

export const SET_ASK_DUNCIT_TOOL_ACCESS = gql`
  mutation AiSetAskDuncitToolAccess($role: AskDuncitRoleKey!, $tool: String!, $access: AskDuncitToolAccess!, $forceApproval: Boolean) {
    setAskDuncitToolAccess(role: $role, tool: $tool, access: $access, force_approval: $forceApproval) {
      ...AiAskDuncitSettingsAck
    }
  }
  ${SETTINGS_ACK}
`;

export const CREATE_ASK_DUNCIT_KNOWLEDGE = gql`
  mutation AiCreateAskDuncitKnowledge($input: AskDuncitKnowledgeInput!) {
    createAskDuncitKnowledge(input: $input) {
      id
    }
  }
`;

export const UPDATE_ASK_DUNCIT_KNOWLEDGE = gql`
  mutation AiUpdateAskDuncitKnowledge($id: ID!, $input: AskDuncitKnowledgeInput!) {
    updateAskDuncitKnowledge(id: $id, input: $input) {
      id
      version
    }
  }
`;

export const DELETE_ASK_DUNCIT_KNOWLEDGE = gql`
  mutation AiDeleteAskDuncitKnowledge($id: ID!) {
    deleteAskDuncitKnowledge(id: $id)
  }
`;

export const REVIEW_ASK_DUNCIT_FEEDBACK = gql`
  mutation AiReviewAskDuncitFeedback($messageId: ID!, $status: String!, $note: String, $addToKnowledge: Boolean) {
    reviewAskDuncitFeedback(message_id: $messageId, status: $status, note: $note, add_to_knowledge: $addToKnowledge) {
      id
      review_status
      review_note
      knowledge_draft_id
    }
  }
`;
