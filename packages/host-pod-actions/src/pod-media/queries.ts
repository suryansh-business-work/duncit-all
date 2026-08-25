import { gql } from '@apollo/client';

/*
  Written out in full rather than sharing one interpolated selection: the app's
  codegen refuses an interpolated `gql` document, and the schema gate skips
  what it cannot parse — a shared constant here has broken both before. The
  three documents ask for the same fields on purpose.
*/

/**
 * A pod's media, in one read.
 *
 * The host's page, a guest arriving on the shared link and the Complete Pod
 * dialog all send THIS query — "what has this pod got" must not have two
 * answers (rule 41's one-board rule, applied to media).
 */
export const POD_MEDIA_BOARD = gql`
  query PodMediaBoard($pod_doc_id: ID!) {
    podMediaBoard(pod_doc_id: $pod_doc_id) {
      pod_id
      pod_title
      pod_date_time
      viewer
      can_upload
      is_cancelled
      count
      items {
        url
        type
        source
        uploaded_by_id
        uploaded_by_name
        uploaded_at
        mine
        can_remove
      }
    }
  }
`;

/** Adds what was just uploaded and answers with the whole board again. */
export const ADD_POD_PARTY_MEDIA = gql`
  mutation AddPodPartyMedia($pod_doc_id: ID!, $media: [PodMediaInput!]!) {
    addPodPartyMedia(pod_doc_id: $pod_doc_id, media: $media) {
      pod_id
      pod_title
      pod_date_time
      viewer
      can_upload
      is_cancelled
      count
      items {
        url
        type
        source
        uploaded_by_id
        uploaded_by_name
        uploaded_at
        mine
        can_remove
      }
    }
  }
`;

/** Takes one item down — your own, or any of them if you host the pod. */
export const REMOVE_POD_PARTY_MEDIA = gql`
  mutation RemovePodPartyMedia($pod_doc_id: ID!, $url: String!) {
    removePodPartyMedia(pod_doc_id: $pod_doc_id, url: $url) {
      pod_id
      pod_title
      pod_date_time
      viewer
      can_upload
      is_cancelled
      count
      items {
        url
        type
        source
        uploaded_by_id
        uploaded_by_name
        uploaded_at
        mine
        can_remove
      }
    }
  }
`;

export type PodMediaViewer = 'HOST' | 'GUEST' | 'NONE';

export interface PodMediaBoardItem {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  source: 'HOST' | 'GUEST';
  uploaded_by_id: string;
  uploaded_by_name: string;
  uploaded_at: string | null;
  mine: boolean;
  can_remove: boolean;
}

export interface PodMediaBoard {
  pod_id: string;
  pod_title: string;
  pod_date_time: string | null;
  viewer: PodMediaViewer;
  can_upload: boolean;
  is_cancelled: boolean;
  count: number;
  items: PodMediaBoardItem[];
}
