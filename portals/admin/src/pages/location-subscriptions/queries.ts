import { gql } from '@apollo/client';

export type LocationSubscriptionStatus = 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED';

/** One subscriber, as `locationSubscriptionsTable` pages them. */
export interface LocationSubscriptionRow {
  id: string;
  location_doc_id: string;
  city: string;
  user_id: string;
  name: string;
  whatsapp: string;
  /** Whether they agreed to share their current location when they subscribed. */
  location_shared: boolean;
  status: LocationSubscriptionStatus;
  reason: string;
  notified_at?: string | null;
  created_at: string;
}

export interface LocationSubscriptionCity {
  location: {
    id: string;
    city: string;
    location_name: string;
    location_image: string;
    is_launched: boolean;
  };
  subscriber_count: number;
  notified_count: number;
  pending_count: number;
}

/** A city summary flattened, so the client table can sort on its own fields. */
export interface LaunchCityRow {
  id: string;
  city: string;
  location_image: string;
  is_launched: boolean;
  subscriber_count: number;
  notified_count: number;
  pending_count: number;
}

export const LOCATION_SUBSCRIPTION_CITIES = gql`
  query LocationSubscriptionCities {
    locationSubscriptionCities {
      subscriber_count
      notified_count
      pending_count
      location {
        id
        city
        location_name
        location_image
        is_launched
      }
    }
  }
`;

export const LOCATION_SUBSCRIPTIONS_TABLE = gql`
  query LocationSubscriptionsTable($query: TableQueryInput) {
    locationSubscriptionsTable(query: $query) {
      total
      rows {
        id
        location_doc_id
        city
        user_id
        name
        whatsapp
        location_shared
        status
        reason
        notified_at
        created_at
      }
    }
  }
`;

export const SEND_LOCATION_LAUNCH_MESSAGE = gql`
  mutation SendLocationLaunchMessage($location_doc_id: ID!) {
    sendLocationLaunchMessage(location_doc_id: $location_doc_id) {
      queued
    }
  }
`;
