import { gql } from '@/generated/graphql';

/**
 * A pod's own photos and videos.
 *
 * Re-declared here rather than imported from `@duncit/host-pod-actions`: that
 * package is MUI, the native app cannot consume it, and codegen only sees
 * documents written inline in this workspace. The SHARED half (the link, the
 * copy, the item shape) lives in `@duncit/utils`, which both apps do consume —
 * rule 40's "share logic, never UI".
 */
export const PodMediaBoardDocument = gql(`
  query MobilePodMediaBoard($pod_doc_id: ID!) {
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
`);

export const AddPodPartyMediaDocument = gql(`
  mutation MobileAddPodPartyMedia($pod_doc_id: ID!, $media: [PodMediaInput!]!) {
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
`);

export const RemovePodPartyMediaDocument = gql(`
  mutation MobileRemovePodPartyMedia($pod_doc_id: ID!, $url: String!) {
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
`);
