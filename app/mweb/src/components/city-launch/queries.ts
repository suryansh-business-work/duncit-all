import { gql } from '@apollo/client';
import type { LaunchPageMedia } from '@duncit/utils';

/** Everything the waitlist page draws. The mutation answers with the same
 * selection, so a subscribe updates the view straight from the cache. */
const LAUNCH_STATUS_FIELDS = gql`
  fragment CityLaunchStatusFields on LocationLaunchStatus {
    subscriber_count
    launch_target
    is_subscribed
    location {
      id
      location_id
      location_name
      city
      location_image
      whatsapp_group_url
    }
    launch_media {
      hero_video_url
      hero_image_url
      host_video_url
      host_image_url
      venue_video_url
      venue_image_url
      club_admin_video_url
      club_admin_image_url
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
  mutation SubscribeCityLaunch($locationId: ID!, $locationShared: Boolean!) {
    subscribeLocationLaunch(location_doc_id: $locationId, location_shared: $locationShared) {
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
    /** The city's slug (e.g. "agra") — what its shareable link carries. */
    location_id: string;
    location_name: string;
    city: string;
    location_image: string;
    whatsapp_group_url: string;
  };
  /** The backdrop behind each section, already resolved: the city's own file where set, else the global one. */
  launch_media: LaunchPageMedia;
}

/** The server's code for an account with no WhatsApp number to notify. */
export const WHATSAPP_REQUIRED = 'WHATSAPP_REQUIRED';
