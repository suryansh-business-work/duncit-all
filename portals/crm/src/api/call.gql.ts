import { gql } from '@apollo/client';
import type { CommsTranscriptSegment, CommunicationLog, CrmCallControlResult, CrmCallSetup } from '@duncit/gql-types';

const CALL_PROMPT_FIELDS = `id name description context language is_active created_by created_at updated_at`;

export const CRM_CALL_PROMPTS = gql`
  query CrmCallPrompts($filter: CrmCallPromptFilter) {
    crmCallPrompts(filter: $filter) { ${CALL_PROMPT_FIELDS} }
  }
`;

/** Server-side table page (search/sort/filter/paginate) for the Static Content table. */
export const CRM_CALL_PROMPTS_TABLE = gql`
  query CrmCallPromptsTable($query: TableQueryInput) {
    crmCallPromptsTable(query: $query) {
      total
      rows { ${CALL_PROMPT_FIELDS} }
    }
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
    $entity_type: CommsLogEntity!
    $id: ID!
    $contact_number: String!
    $prompt_id: ID!
    $voice: String
    $contact_name: String
  ) {
    startCrmAiCall(
      entity_type: $entity_type
      id: $id
      contact_number: $contact_number
      prompt_id: $prompt_id
      voice: $voice
      contact_name: $contact_name
    ) {
      ok
      message
      code
      log_id
      external_id
    }
  }
`;

export const START_CRM_PORTAL_CALL = gql`
  mutation StartCrmPortalCall($entity_type: CommsLogEntity!, $id: ID!, $contact_number: String!, $agent_number: String, $contact_name: String) {
    startCrmPortalCall(entity_type: $entity_type, id: $id, contact_number: $contact_number, agent_number: $agent_number, contact_name: $contact_name) {
      ok
      message
      code
      log_id
      external_id
    }
  }
`;

/** Can a call be placed right now, and from which numbers (Call From / agent phone). */
export const CRM_CALL_SETUP = gql`
  query CrmCallSetup {
    crmCallSetup {
      configured
      missing
      from_number
      agent_number
      agent_source
      recording_enabled
      live_transcription
      can_configure
    }
  }
`;

export const CONTROL_CRM_CALL = gql`
  mutation ControlCrmCall($log_id: ID!, $action: CrmCallAction!) {
    controlCrmCall(log_id: $log_id, action: $action) {
      ok
      message
      log_id
      status
      muted
      on_hold
    }
  }
`;

const LIVE_CALL_FIELDS = `
  id
  entity_type
  entity_id
  contact_name
  contact_value
  from_number
  status
  answered_at
  muted
  on_hold
  transcript_segments { seq speaker text confidence at }
`;

/** The agent's call that is still live, so a reload brings the call window back. */
export const MY_ACTIVE_CRM_CALL = gql`
  query MyActiveCrmCall {
    myActiveCrmCall { ${LIVE_CALL_FIELDS} }
  }
`;

export type CallSetup = Pick<
  CrmCallSetup,
  'configured' | 'missing' | 'from_number' | 'agent_number' | 'agent_source' | 'recording_enabled' | 'live_transcription' | 'can_configure'
>;

export type TranscriptSegment = Pick<CommsTranscriptSegment, 'seq' | 'speaker' | 'text' | 'confidence' | 'at'>;

export type LiveCallLog = Pick<
  CommunicationLog,
  'id' | 'entity_type' | 'entity_id' | 'contact_name' | 'contact_value' | 'from_number' | 'status' | 'answered_at' | 'muted' | 'on_hold'
> & { transcript_segments: TranscriptSegment[] };

export type CallControlResult = Pick<CrmCallControlResult, 'ok' | 'message' | 'log_id' | 'status' | 'muted' | 'on_hold'>;

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
  /** Why the call was not placed, e.g. TWILIO_NOT_CONFIGURED. */
  code?: string | null;
  log_id: string | null;
  external_id: string | null;
}
