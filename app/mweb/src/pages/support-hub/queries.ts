import { gql } from '@apollo/client';

export const MY_ACTIVE_SUPPORT_PODS = gql`
  query MyActiveSupportPods {
    myPodMemberships(status: JOINED) {
      id
      pod {
        id
        pod_id
        pod_title
        pod_date_time
        pod_end_date_time
      }
    }
  }
`;

export const SUPPORT_CALL_TARGET = gql`
  query SupportCallTarget {
    bouncerSupportTarget {
      phone
      available
    }
  }
`;

export const MY_ACTIVE_SOS = gql`
  query MyActiveBouncerSos($pod_id: ID!) {
    myActiveBouncerSos(pod_id: $pod_id) {
      id
      status
      message
      created_at
      acknowledged_at
    }
  }
`;

export const RAISE_SOS = gql`
  mutation RaiseBouncerSos($input: RaiseSosInput!) {
    raiseBouncerSos(input: $input) {
      id
      status
      message
      created_at
    }
  }
`;

export const REQUEST_CALLBACK = gql`
  mutation RequestBouncerCallback($input: RequestCallbackInput!) {
    requestBouncerCallback(input: $input) {
      id
      status
      created_at
    }
  }
`;

export const SUBMIT_FEEDBACK = gql`
  mutation SubmitBouncerFeedback($input: SubmitBouncerFeedbackInput!) {
    submitBouncerFeedback(input: $input) {
      id
      rating
      category
      created_at
    }
  }
`;

export interface SupportPodOption {
  membershipId: string;
  podDocId: string;
  podSlug: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
}

export const MY_PENDING_POD_FEEDBACK = gql`
  query MyPendingPodFeedback {
    myPendingPodFeedback {
      id
      title
    }
  }
`;

export const MY_CALLBACK_REQUESTS = gql`
  query MyCallbackRequests {
    myCallbackRequests {
      id
      reason
      status
      contacted_at
      duration_seconds
      conclusion
      created_at
    }
  }
`;

export interface CallbackHistoryItem {
  id: string;
  reason: string;
  status: 'PENDING' | 'CONTACTED' | 'CLOSED';
  contacted_at: string | null;
  duration_seconds: number | null;
  conclusion: string | null;
  created_at: string;
}

export const MY_UNIFIED_SUPPORT_TICKETS = gql`
  query MyUnifiedSupportTickets {
    myUnifiedSupportTickets {
      id
      ticket_no
      title
      status
      source
      created_at
    }
  }
`;
