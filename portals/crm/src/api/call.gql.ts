import { gql } from '@apollo/client';

const CALL_PROMPT_FIELDS = `id name description context language is_active created_by created_at updated_at`;

export const CRM_CALL_PROMPTS = gql`
  query CrmCallPrompts($filter: CrmCallPromptFilter) {
    crmCallPrompts(filter: $filter) { ${CALL_PROMPT_FIELDS} }
  }
`;

export const CRM_CALL_PROMPT = gql`
  query CrmCallPrompt($id: ID!) {
    crmCallPrompt(id: $id) { ${CALL_PROMPT_FIELDS} }
  }
`;

export const CREATE_CRM_CALL_PROMPT = gql`
  mutation CreateCrmCallPrompt($input: CreateCrmCallPromptInput!) {
    createCrmCallPrompt(input: $input) { ${CALL_PROMPT_FIELDS} }
  }
`;

export const UPDATE_CRM_CALL_PROMPT = gql`
  mutation UpdateCrmCallPrompt($id: ID!, $input: UpdateCrmCallPromptInput!) {
    updateCrmCallPrompt(id: $id, input: $input) { ${CALL_PROMPT_FIELDS} }
  }
`;

export const DELETE_CRM_CALL_PROMPT = gql`
  mutation DeleteCrmCallPrompt($id: ID!) {
    deleteCrmCallPrompt(id: $id)
  }
`;

export const CRM_CALL_FROM_NUMBER = gql`
  query CrmCallFromNumber {
    crmCallFromNumber
  }
`;

export const START_CRM_AI_CALL = gql`
  mutation StartCrmAiCall(
    $entity: CrmAiEntity!
    $id: ID!
    $contact_number: String!
    $prompt_id: ID!
    $voice: String
    $contact_name: String
  ) {
    startCrmAiCall(
      entity: $entity
      id: $id
      contact_number: $contact_number
      prompt_id: $prompt_id
      voice: $voice
      contact_name: $contact_name
    ) {
      ok
      message
      log_id
      external_id
    }
  }
`;

export const START_CRM_PORTAL_CALL = gql`
  mutation StartCrmPortalCall($entity: CrmAiEntity!, $id: ID!, $contact_number: String!, $agent_number: String, $contact_name: String) {
    startCrmPortalCall(entity: $entity, id: $id, contact_number: $contact_number, agent_number: $agent_number, contact_name: $contact_name) {
      ok
      message
      log_id
      external_id
    }
  }
`;

export const RECONCILE_CRM_CALL = gql`
  mutation ReconcileCrmCall($log_id: ID!) {
    reconcileCrmCall(log_id: $log_id) {
      ok
      message
      log_id
      status
    }
  }
`;

export interface CrmCallPrompt {
  id: string;
  name: string;
  description: string;
  context: string;
  language: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CrmAiCallResult {
  ok: boolean;
  message: string;
  log_id: string | null;
  external_id: string | null;
}
