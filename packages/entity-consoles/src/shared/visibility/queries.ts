import { gql } from '@apollo/client';

/**
 * Hide a pod or a club from the app, or show it again.
 *
 * Both return the record's id with its new flags, so every page already
 * holding that record in the Apollo cache repaints without being asked to.
 */
export const SET_POD_HIDDEN = gql`
  mutation ConsoleSetPodHidden($id: ID!, $hidden: Boolean!, $reason: String) {
    setPodHidden(pod_doc_id: $id, hidden: $hidden, reason: $reason) {
      id
      is_hidden
      hidden_by_club
      hidden_reason
      club_hidden_reason
    }
  }
`;

export const SET_CLUB_HIDDEN = gql`
  mutation ConsoleSetClubHidden($id: ID!, $hidden: Boolean!, $reason: String) {
    setClubHidden(club_doc_id: $id, hidden: $hidden, reason: $reason) {
      id
      is_hidden
      hidden_reason
    }
  }
`;

/** The flags a pod row or page carries. Reasons are null outside a console. */
export interface PodVisibilityFields {
  is_hidden?: boolean | null;
  hidden_by_club?: boolean | null;
  hidden_reason?: string | null;
  club_hidden_reason?: string | null;
}

/** Hidden for either reason — its own flag, or its club's. */
export const isPodHidden = (pod: PodVisibilityFields): boolean =>
  !!pod.is_hidden || !!pod.hidden_by_club;
