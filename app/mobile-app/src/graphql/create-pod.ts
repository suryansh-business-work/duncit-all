import { gql } from '@/generated/graphql';

/** Host status + the clubs/venues a host can attach a new pod to. */
export const CreatePodOptionsDocument = gql(`
  query MobileCreatePodOptions {
    myHost {
      id
      status
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
    }
  }
`);

/** Creates a pod with the signed-in approved host attached server-side. */
export const CreatePartnerPodDocument = gql(`
  mutation MobileCreatePartnerPod($input: CreatePodInput!) {
    createPartnerPod(input: $input) {
      id
    }
  }
`);
