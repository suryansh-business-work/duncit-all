import { gql } from '@apollo/client';

/** Everything the waitlist page draws. The mutation answers with the same
 * selection, so a subscribe updates the view straight from the cache. */
const LAUNCH_STATUS_FIELDS = gql`
  fragment CityLaunchStatusFields on LocationLaunchStatus {
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
`;

export const LOCATION_LAUNCH_STATUS = gql`
  query CityLaunchStatus($locationId: ID!) {
    locationLaunchStatus(location_doc_id: $locationId) {
      ...CityLaunchStatusFields
    }
  }
  ${LAUNCH_STATUS_FIELDS}
`;

export const SUBSCRIBE_LOCATION_LAUNCH = gql`
  mutation SubscribeCityLaunch($locationId: ID!) {
    subscribeLocationLaunch(location_doc_id: $locationId) {
      ...CityLaunchStatusFields
    }
  }
  ${LAUNCH_STATUS_FIELDS}
`;

export interface CityLaunchStatus {
  subscriber_count: number;
  launch_target: number;
  is_subscribed: boolean;
  location: {
    id: string;
    location_name: string;
    city: string;
    location_image: string;
    whatsapp_group_url: string;
  };
}

/** The server's code for an account with no WhatsApp number to notify. */
export const WHATSAPP_REQUIRED = 'WHATSAPP_REQUIRED';
