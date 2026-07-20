import { gql } from '@apollo/client';

export const PARTNER_PODS_PAGE = gql`
  query PartnerPodsPage {
    myHost { id status }
    clubs(filter: { is_active: true }) {
      id
      club_name
      meetup_venues_id
      super_category_id
      category_id
    }
    myVenues { id venue_name city locality status is_active }
    availablePodProducts {
      id
      product_name
      unit_cost
      available_count
      listing_review_status
      super_category_id
      category_id
      sub_category_id
      categories {
        super_category_id
        category_id
        sub_category_id
      }
    }
    myHostPods {
      id
      pod_title
      pod_description
      pod_images_and_videos { url type }
      club_id
      venue_id
      pod_mode
      pod_date_time
      pod_amount
      pod_attendees
      is_active
      completed_at
    }
  }
`;

/** Lookups only — the pods list itself is served by MY_HOST_PODS_TABLE. */
export const PARTNER_POD_LOOKUPS = gql`
  query PartnerPodLookups {
    myHost { id status }
    clubs(filter: { is_active: true }) {
      id
      club_name
      meetup_venues_id
      super_category_id
      category_id
    }
    myVenues { id venue_name city locality status is_active }
    availablePodProducts {
      id
      product_name
      unit_cost
      available_count
      listing_review_status
      super_category_id
      category_id
      sub_category_id
      categories {
        super_category_id
        category_id
        sub_category_id
      }
    }
  }
`;

/** Row shape for the partner pods table (myHostPodsTable rows). */
export interface PartnerPodRow {
  id: string;
  pod_title: string;
  pod_description?: string | null;
  pod_images_and_videos?: { url: string; type: string }[] | null;
  club_id?: string | null;
  venue_id?: string | null;
  pod_mode?: string | null;
  pod_date_time?: string | null;
  pod_amount?: number | null;
  pod_attendees?: string[] | null;
  is_active: boolean;
  completed_at?: string | null;
}

/** Same selection as the legacy myHostPods rows so table rows can feed the
 * edit dialog without a second fetch. */
const PARTNER_POD_ROW_FIELDS = gql`
  fragment PartnerPodRowFields on Pod {
    id
    pod_title
    pod_description
    pod_images_and_videos { url type }
    club_id
    venue_id
    pod_mode
    pod_date_time
    pod_amount
    pod_attendees
    is_active
    completed_at
  }
`;

export const MY_HOST_PODS_TABLE = gql`
  query PartnerMyHostPodsTable($query: TableQueryInput) {
    myHostPodsTable(query: $query) {
      total
      rows {
        ...PartnerPodRowFields
      }
    }
  }
  ${PARTNER_POD_ROW_FIELDS}
`;

export const CREATE_PARTNER_POD = gql`
  mutation CreatePartnerPod($input: CreatePodInput!) {
    createPartnerPod(input: $input) { id }
  }
`;

export const HOST_UPDATE_POD = gql`
  mutation PartnerHostUpdatePod($pod_doc_id: ID!, $input: HostUpdatePodInput!) {
    hostUpdatePod(pod_doc_id: $pod_doc_id, input: $input) {
      id
      pod_title
      pod_description
      pod_images_and_videos { url type }
    }
  }
`;