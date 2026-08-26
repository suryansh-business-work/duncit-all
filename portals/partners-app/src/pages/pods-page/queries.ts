import { gql } from '@apollo/client';
import { POD_PICKER_PRODUCT_FIELDS } from '@duncit/pod-product-picker';

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
      ...PodPickerProductFields
      listing_review_status
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
  ${POD_PICKER_PRODUCT_FIELDS}
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
      ...PodPickerProductFields
      listing_review_status
    }
  }
  ${POD_PICKER_PRODUCT_FIELDS}
`;

/** Row shape for the partner pods table (myHostPodsTable rows). */
export interface PartnerPodRow {
  id: string;
  pod_id?: string | null;
  pod_title: string;
  pod_description?: string | null;
  pod_images_and_videos?: { url: string; type: string }[] | null;
  club_id?: string | null;
  club_slug?: string | null;
  venue_id?: string | null;
  pod_mode?: string | null;
  pod_type?: string | null;
  pod_date_time?: string | null;
  pod_end_date_time?: string | null;
  pod_amount?: number | null;
  pod_attendees?: string[] | null;
  /** Hosts sit inside pod_attendees but never pay — see payingAttendees. */
  pod_hosts_id?: string[] | null;
  /** Seats scanned in at the door — what a completed pod settles on. */
  attendance?: { attended_seats: number; booked_seats: number; recorded: boolean } | null;
  /** Drives the "Venue rejected" status and the resubmit-instead-of-edit branch. */
  venue_approval_status?: string | null;
  zone_name?: string | null;
  is_active: boolean;
  is_deleted?: boolean | null;
  completed_at?: string | null;
}

/** Same selection as the legacy myHostPods rows so table rows can feed the
 * edit, resubmit and complete dialogs without a second fetch. */
const PARTNER_POD_ROW_FIELDS = gql`
  fragment PartnerPodRowFields on Pod {
    id
    pod_id
    pod_title
    pod_description
    pod_images_and_videos { url type }
    club_id
    club_slug
    venue_id
    pod_mode
    pod_type
    pod_date_time
    pod_end_date_time
    pod_amount
    pod_attendees
    attendance { attended_seats booked_seats recorded }
    venue_approval_status
    zone_name
    is_active
    is_deleted
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