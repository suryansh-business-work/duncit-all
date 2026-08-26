import { gql } from '@apollo/client';

/** A drafts-list row. `expires_at` is the server's own deletion date, so the
 * countdown can never promise a day the retention sweep disagrees with. */
export interface DraftRowData {
  id: string;
  pod_title?: string | null;
  step?: number | null;
  updated_at?: string | null;
  expires_at?: string | null;
}

export const MY_POD_DRAFTS = gql`
  query MyPodDrafts {
    myPodDrafts {
      id
      pod_title
      step
      updated_at
      expires_at
    }
  }
`;

export const DELETE_POD_DRAFT = gql`
  mutation DeletePodDraft($draft_id: ID!) {
    deletePodDraft(draft_id: $draft_id)
  }
`;
