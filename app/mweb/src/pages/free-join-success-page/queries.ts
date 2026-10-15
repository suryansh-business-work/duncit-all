import { gql } from '@apollo/client';

/**
 * What the free-join confirmation draws: the pod's title and times (the pod
 * card and the calendar shortcut) and whether the caller really holds a spot
 * on it — the page is a URL, so it must not congratulate somebody who has none.
 */
export const FREE_JOIN_SUCCESS = gql`
  query FreeJoinSuccess($id: ID!) {
    pod(pod_doc_id: $id) {
      id
      pod_title
      pod_date_time
      pod_end_date_time
    }
    podMembershipState(pod_doc_id: $id) {
      pod_id
      is_member
    }
  }
`;

export interface FreeJoinSuccessData {
  pod: {
    id: string;
    pod_title: string;
    pod_date_time?: string | null;
    pod_end_date_time?: string | null;
  } | null;
  podMembershipState: { pod_id: string; is_member: boolean } | null;
}
