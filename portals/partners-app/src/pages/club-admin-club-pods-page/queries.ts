import { gql } from '@apollo/client';
import { POD_PICKER_PRODUCT_FIELDS } from '@duncit/pod-product-picker';

export const CLUB_ADMIN_POD_LOOKUPS = gql`
  query ClubAdminPodLookups {
    myAdminClubs {
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
      attendance { attended_seats booked_seats recorded }
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
    attendance { attended_seats booked_seats recorded }
    is_active
    is_deleted
    venue_approval_status
    completed_at
  }
`;

/** Club-scoped server-side (not a client filter) and deliberately covering
 * EVERY stage — pods awaiting venue approval and cancelled ones included — so
 * a club admin can open and edit a pod wherever it sits in the booking cycle.
 *
 * `status` narrows to one bucket of the Status column, server-side, so the
 * filter pages over every matching pod rather than the page already fetched. */
export const CLUB_ADMIN_PODS_TABLE = gql`
  query ClubAdminPodsTable($club_id: ID, $query: TableQueryInput, $status: PodRowStatus) {
    clubAdminPodsTable(club_id: $club_id, query: $query, status: $status) {
      total
      rows {
        ...ClubAdminPodRowFields
      }
    }
  }
  ${CLUB_ADMIN_POD_ROW_FIELDS}
`;

/** Single-pod fetch for the /club-admin/clubs/:clubId/pods/:id/edit page.
 * Its own query rather than the public pod query: a cancelled pod stays editable
 * here, and only this one returns soft-deleted rows to a club admin. */
export const CLUB_ADMIN_POD_FOR_EDIT = gql`
  query ClubAdminPodForEdit($pod_doc_id: ID!) {
    clubAdminPodForEdit(pod_doc_id: $pod_doc_id) {
      ...ClubAdminPodRowFields
    }
  }
  ${CLUB_ADMIN_POD_ROW_FIELDS}
`;

/** The AI-monitored action trail of one pod in the caller's clubs. */
export const CLUB_ADMIN_POD_AUDIT_LOGS = gql`
  query ClubAdminPodAuditLogs($pod_doc_id: ID!) {
    clubAdminPodAuditLogs(pod_doc_id: $pod_doc_id) {
      id
      action
      source
      actor_name
      note
      changes { field from to }
      ai_risk
      ai_summary
      created_at
    }
  }
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

/**
 * A Club Admin opens an Auto Pod FOR this club: `club_id` enrols the club at
 * creation, so the offer only ever waits on a venue and a host, and the server
 * fixes the category to the club's own.
 */
export const CLUB_ADMIN_CREATE_AUTO_POD = gql`
  mutation ClubAdminCreateAutoPod($input: CreateAutoPodInput!, $club_id: ID) {
    createAutoPod(input: $input, club_id: $club_id) {
      id
      auto_pod_no
    }
  }
`;
