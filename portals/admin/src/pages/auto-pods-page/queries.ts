import { gql } from '@apollo/client';
import type { AutoPodTemplateRow } from '@duncit/pod-form';
import type {
  AutoPodClubClaim,
  AutoPodHostClaim,
  AutoPodLocation,
  AutoPodStage,
  AutoPodVenueClaim,
} from '@duncit/utils';

/**
 * One Auto Pod as the admin console reads it: the template the admin wrote plus
 * the three enrolment claims. The claims are selected in full because the shared
 * tick row (`@duncit/auto-pods`) types them off `@duncit/utils` — a partial
 * selection would be a different shape, not a smaller one.
 */
const ADMIN_AUTO_POD_FIELDS = gql`
  fragment AdminAutoPodFields on AutoPod {
    id
    auto_pod_no
    stage
    is_active
    pod_title
    pod_description
    pod_info
    pod_hashtag
    pod_images_and_videos {
      url
      type
    }
    super_category_id
    sub_category_id
    category_name
    category_path
    pod_mode
    pod_amount
    no_of_spots
    pod_occurrence
    payment_terms
    venue_claim {
      venue_id
      venue_slot_id
      owner_user_id
      venue_name
      pod_date_time
      pod_end_date_time
      slot_price
      accepted_at
    }
    host_claim {
      user_id
      host_name
      assigned_at
    }
    club_claim {
      club_id
      club_name
      user_id
      claimed_at
    }
    location {
      location_id
      location_name
      country
      state
      city
      bound_by
      bound_at
    }
    pod_id
    expires_at
    created_at
    updated_at
  }
`;

/** DUNCIT TABLE CONTRACT v1 — server-paged, sorted and filtered. */
export const ADMIN_AUTO_PODS_TABLE = gql`
  ${ADMIN_AUTO_POD_FIELDS}
  query AdminAutoPodsTable($query: TableQueryInput) {
    adminAutoPodsTable(query: $query) {
      rows {
        ...AdminAutoPodFields
      }
      total
    }
  }
`;

/** The template fields the full-page editor rehydrates from, plus what locks its category. */
export const AUTO_POD_FOR_EDIT = gql`
  query AdminAutoPodForEdit($auto_pod_doc_id: ID!) {
    autoPod(auto_pod_doc_id: $auto_pod_doc_id) {
      id
      stage
      pod_title
      pod_description
      pod_info
      pod_hashtag
      pod_images_and_videos {
        url
        type
      }
      reel_url
      super_category_id
      sub_category_id
      pod_mode
      meeting_platform
      meeting_url
      meeting_notes
      pod_date_time
      pod_end_date_time
      pod_amount
      no_of_spots
      pod_occurrence
      what_this_pod_offers
      available_perks
      payment_terms
      place_charges {
        label
        amount
        note
      }
      product_requests {
        product_id
        quantity
      }
      host_claim {
        user_id
      }
      club_claim {
        club_id
      }
      location {
        location_id
        city
        state
      }
    }
  }
`;

export const CREATE_AUTO_POD = gql`
  ${ADMIN_AUTO_POD_FIELDS}
  mutation AdminCreateAutoPod($input: CreateAutoPodInput!) {
    createAutoPod(input: $input) {
      ...AdminAutoPodFields
    }
  }
`;

export const UPDATE_AUTO_POD = gql`
  ${ADMIN_AUTO_POD_FIELDS}
  mutation AdminUpdateAutoPod($auto_pod_doc_id: ID!, $input: UpdateAutoPodInput!) {
    updateAutoPod(auto_pod_doc_id: $auto_pod_doc_id, input: $input) {
      ...AdminAutoPodFields
    }
  }
`;

export const CANCEL_AUTO_POD = gql`
  mutation AdminCancelAutoPod($auto_pod_doc_id: ID!, $reason: String) {
    cancelAutoPod(auto_pod_doc_id: $auto_pod_doc_id, reason: $reason) {
      id
      stage
      cancel_reason
      cancelled_at
    }
  }
`;

/** Pause (false) or resume (true) an offer still enrolling. */
export const SET_AUTO_POD_ACTIVE = gql`
  ${ADMIN_AUTO_POD_FIELDS}
  mutation AdminSetAutoPodActive($auto_pod_doc_id: ID!, $is_active: Boolean!) {
    setAutoPodActive(auto_pod_doc_id: $auto_pod_doc_id, is_active: $is_active) {
      ...AdminAutoPodFields
    }
  }
`;

export const DELETE_AUTO_POD = gql`
  mutation AdminDeleteAutoPod($auto_pod_doc_id: ID!) {
    deleteAutoPod(auto_pod_doc_id: $auto_pod_doc_id)
  }
`;

/** Row shape of `adminAutoPodsTable`, matching the fragment above. */
export interface AutoPodTableRow {
  id: string;
  auto_pod_no: string;
  stage: AutoPodStage;
  is_active: boolean;
  pod_title: string;
  pod_description: string;
  pod_info: string;
  pod_hashtag: string[];
  pod_images_and_videos: { url: string; type: string }[];
  super_category_id: string;
  sub_category_id: string;
  category_name: string | null;
  /** Super › Category › Sub names, as far up as the tree resolves. */
  category_path: string[];
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  pod_amount: number;
  no_of_spots: number;
  pod_occurrence: string;
  payment_terms: string | null;
  venue_claim: AutoPodVenueClaim | null;
  host_claim: AutoPodHostClaim | null;
  club_claim: AutoPodClubClaim | null;
  location: AutoPodLocation | null;
  pod_id: string | null;
  /** When the offer is released unless everyone enrols by then; null once it is not enrolling. */
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape of `AUTO_POD_FOR_EDIT` — the shared template plus the enrolments that lock its category. */
export interface AutoPodEditRow extends AutoPodTemplateRow {
  id: string;
  stage: AutoPodStage;
  host_claim: { user_id: string } | null;
  club_claim: { club_id: string } | null;
  location: Pick<AutoPodLocation, 'location_id' | 'city' | 'state'> | null;
}

/** The enrolled venue behind a green Venue dot — who runs it, where it is, how many it holds. */
export const AUTO_POD_VENUE_DETAILS = gql`
  query AutoPodVenueDetails($venue_doc_id: ID!) {
    venue(venue_doc_id: $venue_doc_id) {
      id
      venue_name
      owner_name
      owner_email
      owner_phone
      address_line1
      address_line2
      locality
      city
      state
      capacity
    }
  }
`;

export interface AutoPodVenueDetails {
  id: string;
  venue_name: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  address_line1: string;
  address_line2: string;
  locality: string;
  city: string;
  state: string;
  capacity: number;
}
