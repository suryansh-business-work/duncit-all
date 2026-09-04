import { gql } from '@apollo/client';

/**
 * The Change Requests documents, spelled out in full.
 *
 * The selection is repeated rather than pulled into a shared `${FIELDS}`
 * constant: an interpolated selection is invisible to
 * `scripts/verify-gql-schema.mjs` unless the fragment and every document using
 * it sit in one file, and the native app's codegen refuses interpolation
 * outright. Keeping both surfaces on the same literal is the cheaper trade.
 */
const CONTACT = `
  user_id
  full_name
  email
  phone
`;

const OFFER = `
  user_id
  display_name
  contact { ${CONTACT} }
  venue_id
  venue_name
  venue_slot_id
  slot_start_at
  slot_end_at
  slot_price
  club_id
  status
  offered_at
  responded_at
  pass_reason
`;

const ROW = `
  id
  change_request_no
  role
  status
  resolution
  reason
  health_penalty
  attendees_at_request
  pod {
    id
    pod_slug
    pod_title
    pod_date_time
    club_slug
    attendee_count
  }
  pod_cancelled
  requested_by { ${CONTACT} }
  from_venue_id
  from_venue_name
  from_club_id
  from_club_name
  offer { ${OFFER} }
  offer_history { ${OFFER} }
  events {
    action
    actor_name
    note
    at
  }
  created_at
  resolved_at
`;

export const MY_POD_CHANGE_BOARD = gql`
  query MyPodChangeBoard {
    myPodChangeBoard {
      mine { ${ROW} }
      incoming { ${ROW} }
      venue_penalty
      host_penalty
      club_admin_penalty
    }
  }
`;

export const REQUEST_POD_CHANGE = gql`
  mutation RequestPodChange($pod_doc_id: ID!, $role: PodChangeRole!, $reason: String) {
    requestPodChange(pod_doc_id: $pod_doc_id, role: $role, reason: $reason) { ${ROW} }
  }
`;

export const RESPOND_TO_POD_CHANGE = gql`
  mutation RespondToPodChange($request_id: ID!, $decision: PodChangeDecision!, $reason: String) {
    respondToPodChange(request_id: $request_id, decision: $decision, reason: $reason) { ${ROW} }
  }
`;

export const WITHDRAW_POD_CHANGE = gql`
  mutation WithdrawPodChange($request_id: ID!) {
    withdrawPodChange(request_id: $request_id) { ${ROW} }
  }
`;

/** Admin-only. Kept here so the console and the studio cannot describe a row
 * differently — the drawer renders the same request the partner sees. */
export const POD_CHANGE_REQUESTS_TABLE = gql`
  query PodChangeRequestsTable($role: PodChangeRole!, $query: TableQueryInput) {
    podChangeRequests(role: $role, query: $query) {
      total
      page
      page_size
      rows { ${ROW} }
    }
  }
`;

export const POD_CHANGE_CANDIDATES = gql`
  query PodChangeCandidates($request_id: ID!) {
    podChangeCandidates(request_id: $request_id) {
      id
      user_id
      label
      detail
      full_name
      email
      phone
      venue_id
      club_id
      club_name
    }
  }
`;

export const POD_CHANGE_VENUE_SLOTS = gql`
  query PodChangeVenueSlots($request_id: ID!, $venue_id: ID!) {
    podChangeVenueSlots(request_id: $request_id, venue_id: $venue_id) {
      id
      venue_id
      start_at
      end_at
      price
      capacity
      space_label
    }
  }
`;

export const OFFER_POD_CHANGE = gql`
  mutation OfferPodChange($input: OfferPodChangeInput!) {
    offerPodChange(input: $input) { ${ROW} }
  }
`;

export const CANCEL_POD_FOR_CHANGE = gql`
  mutation CancelPodForChange($request_id: ID!, $reason: String!) {
    cancelPodForChange(request_id: $request_id, reason: $reason) { ${ROW} }
  }
`;

/** One candidate, as the assign drawer lists them. */
export interface PodChangeCandidateRow {
  id: string;
  user_id: string;
  label: string;
  detail: string;
  full_name: string;
  email: string;
  phone: string;
  venue_id: string | null;
  club_id: string | null;
  club_name: string;
}

/** A free slot at a candidate venue. */
export interface PodChangeSlotRow {
  id: string;
  venue_id: string;
  start_at: string;
  end_at: string | null;
  price: number;
  capacity: number;
  space_label: string;
}
