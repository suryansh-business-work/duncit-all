import { gql } from '@apollo/client';

export const CLUB_ADMIN_POD_LOOKUPS = gql`
  query ClubAdminPodLookups {
    myAdminClubs { id club_name meetup_venues_id }
    myVenues { id venue_name city locality status is_active }
    availablePodProducts {
      id
      product_name
      unit_cost
      available_count
      listing_review_status
    }
  }
`;

export const CLUB_ADMIN_PODS = gql`
  query ClubAdminPods($filter: PodFilterInput) {
    pods(filter: $filter) {
      id
      pod_title
      pod_description
      pod_images_and_videos { url type }
      club_id
      venue_id
      venue_slot_id
      pod_mode
      meeting_platform
      meeting_url
      meeting_notes
      pod_hashtag
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_occurrence
      no_of_spots
      pod_info
      what_this_pod_offers
      available_perks
      payment_terms
      products_enabled
      product_requests { product_id quantity }
      pod_attendees
      is_active
      completed_at
    }
  }
`;

/** Same wide selection as CLUB_ADMIN_PODS rows — table rows prefill the edit form. */
const CLUB_ADMIN_POD_ROW_FIELDS = gql`
  fragment ClubAdminPodRowFields on Pod {
    id
    pod_title
    pod_description
    pod_images_and_videos { url type }
    reel_url
    club_id
    venue_id
    venue_slot_id
    location_id
    pod_mode
    meeting_platform
    meeting_url
    meeting_notes
    pod_hashtag
    pod_hosts_id
    host_names
    pod_date_time
    pod_end_date_time
    pod_type
    pod_amount
    pod_occurrence
    no_of_spots
    pod_info
    what_this_pod_offers
    available_perks
    payment_terms
    place_charges { label amount note }
    products_enabled
    product_requests { product_id quantity }
    pod_attendees
    is_active
    completed_at
  }
`;

export const CLUB_ADMIN_PODS_TABLE = gql`
  query ClubAdminPodsTable($query: TableQueryInput) {
    podsTable(query: $query) {
      total
      rows {
        ...ClubAdminPodRowFields
      }
    }
  }
  ${CLUB_ADMIN_POD_ROW_FIELDS}
`;

/** Approved hosts for the assign-host picker (club-admin scoped, max 20 rows). */
export const CLUB_ADMIN_HOST_SEARCH = gql`
  query ClubAdminHostSearch($search: String) {
    clubAdminHostSearch(search: $search) {
      user_id
      full_name
      email
    }
  }
`;

export const CLUB_ADMIN_CREATE_POD = gql`
  mutation ClubAdminCreatePod($input: CreatePodInput!) {
    clubAdminCreatePod(input: $input) { id }
  }
`;

export const CLUB_ADMIN_UPDATE_POD = gql`
  mutation ClubAdminUpdatePod($pod_doc_id: ID!, $input: UpdatePodInput!) {
    clubAdminUpdatePod(pod_doc_id: $pod_doc_id, input: $input) { id }
  }
`;

export const CLUB_ADMIN_DELETE_POD = gql`
  mutation ClubAdminDeletePod($pod_doc_id: ID!) {
    clubAdminDeletePod(pod_doc_id: $pod_doc_id)
  }
`;
