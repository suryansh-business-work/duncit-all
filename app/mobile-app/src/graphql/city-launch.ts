import { gql } from '@/generated/graphql';

/**
 * A not-yet-launched city's waitlist — the RN twin of mWeb's city-launch
 * queries (rule 27). Both documents select the same fields so a subscribe
 * hands back exactly what the page already renders.
 */
export const LocationLaunchStatusDocument = gql(`
  query MobileLocationLaunchStatus($locationDocId: ID!) {
    locationLaunchStatus(location_doc_id: $locationDocId) {
      subscriber_count
      launch_target
      is_subscribed
      location {
        id
        location_name
        city
        location_image
        whatsapp_group_url
      }
    }
  }
`);

/** Adds the signed-in member to the city's waitlist; repeat taps are no-ops. */
export const SubscribeLocationLaunchDocument = gql(`
  mutation MobileSubscribeLocationLaunch($locationDocId: ID!) {
    subscribeLocationLaunch(location_doc_id: $locationDocId) {
      subscriber_count
      launch_target
      is_subscribed
      location {
        id
        location_name
        city
        location_image
        whatsapp_group_url
      }
    }
  }
`);
