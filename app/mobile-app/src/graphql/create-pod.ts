import { gql } from '@/generated/graphql';

/** Host status + the clubs/venue partners/products a host can attach a new
 * pod to, plus finance settings for the pricing panel. */
export const CreatePodOptionsDocument = gql(`
  query MobileCreatePodOptions {
    me {
      user_id
      roles
      selected_location_id
    }
    clubs(filter: { is_active: true }) {
      id
      club_name
      location_id
      super_category_id
      club_description
      club_feature_images_and_videos {
        url
        type
      }
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
      location_zones {
        zone_name
        pincode
      }
    }
    publicVenues {
      id
      owner_user_id
      location_id
      venue_name
      venue_type
      capacity
      cover_image_url
      city
      locality
      address_line1
      state
      postal_code
      country
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
    availablePodProducts {
      id
      product_name
      unit_cost
      available_count
    }
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
    }
  }
`);

/** Open availability slots on a venue partner's calendar (step 3). */
export const VenueAvailableSlotsDocument = gql(`
  query MobileVenueAvailableSlots($venue_id: ID!) {
    venueAvailableSlots(venue_id: $venue_id) {
      id
      start_at
      end_at
      price
      status
    }
  }
`);

/** A single draft to resume in the stepper. */
export const MyPodDraftDocument = gql(`
  query MobileMyPodDraft($draft_id: ID!) {
    myPodDraft(draft_id: $draft_id) {
      id
      payload
      step
    }
  }
`);

/** Drafts list shown under Host Management. */
export const MyPodDraftsDocument = gql(`
  query MobileMyPodDrafts {
    myPodDrafts {
      id
      pod_title
      step
      updated_at
    }
  }
`);

/** Upserts the in-progress draft (autosave). */
export const SavePodDraftDocument = gql(`
  mutation MobileSavePodDraft($draft_id: ID, $input: PodDraftInput!) {
    savePodDraft(draft_id: $draft_id, input: $input) {
      id
    }
  }
`);

/** Removes a draft. */
export const DeletePodDraftDocument = gql(`
  mutation MobileDeletePodDraft($draft_id: ID!) {
    deletePodDraft(draft_id: $draft_id)
  }
`);

/** Validates + creates the real pod, then deletes the draft. */
export const PublishPodDraftDocument = gql(`
  mutation MobilePublishPodDraft($draft_id: ID!, $input: CreatePodInput!) {
    publishPodDraft(draft_id: $draft_id, input: $input) {
      id
    }
  }
`);
