import { gql } from '@apollo/client';
import { POD_PICKER_PRODUCT_FIELDS } from '@duncit/pod-product-picker';

export const CREATE_POD_OPTIONS = gql`
  query CreatePodOptions {
    me { user_id roles }
    clubs(filter: { is_active: true }) {
      id
      club_name
      location_id
      locality
      super_category_id
      category_id
      matched_venues_count
      available_slots_count
      matched_venues { id }
      club_description
      club_feature_images_and_videos { url type }
    }
    locations(filter: { is_active: true }) {
      id
      location_name
      city
      state
      state_code
      country
      country_code
      location_image
      location_pincode
      active_club_count
      location_zones { zone_name pincode active_club_count }
    }
    publicVenues {
      id
      owner_user_id
      location_id
      venue_name
      venue_type
      capacity
      capacity_items { label capacity }
      cover_image_url
      city
      locality
      address_line1
      state
      postal_code
      country
      lat
      lng
      owner_name
      owner_phone
      owner_email
      is_active
    }
    myHost {
      id
      status
      is_active
      host_categories {
        super_category_id
        category_id
        sub_category_id
        super_category_name
        category_name
        sub_category_name
      }
    }
    subCategories: categories(filter: { level: SUB }) {
      id
      min_pax
    }
    availablePodProducts {
      ...PodPickerProductFields
    }
  }
  ${POD_PICKER_PRODUCT_FIELDS}
`;
export const MY_POD_DRAFT = gql`
  query MyPodDraftForEdit($draft_id: ID!) {
    myPodDraft(draft_id: $draft_id) { id payload step }
  }
`;
export const SAVE_POD_DRAFT = gql`
  mutation SavePodDraft($draft_id: ID, $input: PodDraftInput!) {
    savePodDraft(draft_id: $draft_id, input: $input) { id }
  }
`;
export const PUBLISH_POD_DRAFT = gql`
  mutation PublishPodDraft($draft_id: ID!, $input: CreatePodInput!) {
    publishPodDraft(draft_id: $draft_id, input: $input) { id venue_approval_status }
  }
`;
export const MODERATE_POD_CONTENT = gql`
  mutation ModeratePodContent($input: ModeratePodContentInput!) {
    moderatePodContent(input: $input) {
      allowed
      violations { field step type message evidence }
    }
  }
`;

/** Step 1 — ask a club's admins to get its venues to open slots. */
export const REQUEST_CLUB_VENUE_SLOTS = gql`
  mutation RequestClubVenueSlots($club_doc_id: ID!) {
    requestClubVenueSlots(club_doc_id: $club_doc_id) {
      status
      notified
    }
  }
`;
