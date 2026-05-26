import { gql } from '@apollo/client';

export const MY_ACTIVE_BOUNCER_PODS = gql`
  query MyActiveBouncerPods {
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

export const BOUNCER_SUPPORT_TARGET = gql`
  query BouncerSupportTarget {
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

export interface BouncerPodOption {
  membershipId: string;
  podDocId: string;
  podSlug: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
}
