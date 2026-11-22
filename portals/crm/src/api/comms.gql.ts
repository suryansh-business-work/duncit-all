import { gql } from '@apollo/client';
import type { CommsCallSummary, CommsTranscriptSegment } from '@duncit/gql-types';
import type { CrmLeadEntityType } from './crm.types';

export type CallLogSummary = Pick<
  CommsCallSummary,
  'status' | 'text' | 'key_points' | 'sentiment' | 'outcome' | 'follow_ups' | 'reminder_id' | 'error'
>;

export const COMMS_PROVIDER_OPTIONS = gql`
  query CommsProviderOptions($type: CommsProviderType!) {
    commsProviderOptions(type: $type) {
      id
      name
      is_default
    }
  }
`;

export interface CommsProviderOption {
  id: string;
  name: string;
  is_default: boolean;
}

const SUMMARY_FIELDS = 'status text key_points sentiment outcome follow_ups reminder_id error';

export const COMMUNICATION_LOGS = gql`
  query CommunicationLogs($filter: CommunicationLogFilter, $limit: Int, $offset: Int) {
    communicationLogs(filter: $filter, limit: $limit, offset: $offset) {
      total
      items {
        id
        type
        direction
        entity_type
        entity_id
        provider_id
        provider_name
        contact_name
        contact_value
        subject
        status
        error_message
        duration_seconds
        recording_url
        transcript
        transcript_status
        from_number
        transcript_segments { seq speaker text at }
        summary { ${SUMMARY_FIELDS} }
        created_by
        created_at
      }
    }
  }
`;

/** Generate, or regenerate, the AI summary of a call from its transcript. */
export const SUMMARIZE_COMMUNICATION_LOG = gql`
  mutation SummarizeCommunicationLog($id: ID!) {
    summarizeCommunicationLog(id: $id) {
      id
      summary { ${SUMMARY_FIELDS} }
    }
  }
`;

export const REQUEST_COMMUNICATION_TRANSCRIPT = gql`
  mutation RequestCommunicationTranscript($id: ID!) {
    requestCommunicationTranscript(id: $id) {
      id
      transcript
      transcript_status
      recording_url
    }
  }
`;

export interface CommunicationLogItem {
  id: string;
  type: 'EMAIL' | 'CALL';
  direction: string;
  entity_type: CrmLeadEntityType;
  entity_id: string;
  provider_id: string | null;
  provider_name: string | null;
  contact_name: string | null;
  contact_value: string;
  subject: string | null;
  status: string;
  error_message: string | null;
  duration_seconds: number;
  recording_url: string | null;
  transcript: string | null;
  transcript_status: 'NONE' | 'PENDING' | 'READY' | 'FAILED';
  from_number?: string | null;
  transcript_segments?: Pick<CommsTranscriptSegment, 'seq' | 'speaker' | 'text' | 'at'>[];
  summary?: CallLogSummary | null;
  created_by: string | null;
  created_at: string | null;
}
