import { gql } from '@apollo/client';

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
        created_by
        created_at
      }
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
  entity_type: 'VENUE_LEAD' | 'HOST_LEAD';
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
  created_by: string | null;
  created_at: string | null;
}
