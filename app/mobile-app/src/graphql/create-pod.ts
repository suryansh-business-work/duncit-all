import { gql } from '@/generated/graphql';

/** Host status + the clubs/venues/products a host can attach a new pod to. */
export const CreatePodOptionsDocument = gql(`
  query MobileCreatePodOptions {
    me {
      user_id
      roles
    }
    clubs(filter: { is_active: true }) {
      id
      club_name
      meetup_venues_id
    }
    myVenues {
      id
      venue_name
      city
      locality
      status
      is_active
      address_line1
      state
      postal_code
      country
    }
    availablePodProducts {
      id
      product_name
      unit_cost
      available_count
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
