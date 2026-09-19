import { gql, type TypedDocumentNode } from '@apollo/client';
import {
  LITE_EVENT_CARD_FIELDS,
  LITE_EVENT_FIELDS,
  LITE_REGISTRATION_FIELDS,
  LITE_USER_FIELDS,
  type LiteEvent,
  type LiteEventCard,
  type LiteMe,
} from '../../shared/graphql/documents';
import type { LiteEventFilterVars } from './types';

export interface LiteEventPage {
  rows: LiteEventCard[];
  total: number;
  page: number;
  page_size: number;
}

export interface LiteEventsVars {
  filter?: LiteEventFilterVars | null;
  page?: number | null;
  page_size?: number | null;
}

export const LITE_EVENTS: TypedDocumentNode<{ liteEvents: LiteEventPage }, LiteEventsVars> = gql`
  query LiteEvents($filter: LiteEventFilter, $page: Int, $page_size: Int) {
    liteEvents(filter: $filter, page: $page, page_size: $page_size) {
      rows {
        ...LiteEventCardFields
      }
      total
      page
      page_size
    }
  }
  ${LITE_EVENT_CARD_FIELDS}
`;

export const LITE_EVENT: TypedDocumentNode<{ liteEvent: LiteEvent | null }, { slug: string }> = gql`
  query LiteEvent($slug: String!) {
    liteEvent(slug: $slug) {
      ...LiteEventFields
      viewer_registration {
        ...LiteRegistrationFields
      }
    }
  }
  ${LITE_EVENT_FIELDS}
  ${LITE_REGISTRATION_FIELDS}
`;

export const LITE_MY_EVENTS: TypedDocumentNode<{ liteMyEvents: LiteEventCard[] }, { scope: 'HOSTING' | 'ATTENDING'; past?: boolean }> = gql`
  query LiteMyEvents($scope: LiteMyEventsScope!, $past: Boolean) {
    liteMyEvents(scope: $scope, past: $past) {
      ...LiteEventCardFields
    }
  }
  ${LITE_EVENT_CARD_FIELDS}
`;

export const LITE_USER_PROFILE: TypedDocumentNode<{ liteUserProfile: LiteMe | null }, { handle: string }> = gql`
  query LiteUserProfile($handle: String!) {
    liteUserProfile(handle: $handle) {
      ...LiteUserFields
    }
  }
  ${LITE_USER_FIELDS}
`;

export const LITE_USER_EVENTS: TypedDocumentNode<{ liteUserEvents: LiteEventCard[] }, { handle: string; past?: boolean }> = gql`
  query LiteUserEvents($handle: String!, $past: Boolean) {
    liteUserEvents(handle: $handle, past: $past) {
      ...LiteEventCardFields
    }
  }
  ${LITE_EVENT_CARD_FIELDS}
`;

export interface LiteTicketInput {
  id?: string;
  name: string;
  description?: string;
  price: number;
  quantity: number | null;
  is_active: boolean;
}

export interface LiteQuestionInput {
  id?: string;
  label: string;
  type: 'TEXT' | 'LONG_TEXT' | 'CHECKBOX' | 'SELECT';
  required: boolean;
  options: string[];
}

export interface LiteEventInput {
  title: string;
  description: string;
  cover_url: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: 'IN_PERSON' | 'VIRTUAL';
  address: string | null;
  venue_name: string | null;
  map_url: string | null;
  city_slug: string | null;
  virtual_link: string | null;
  category_id: string | null;
  calendar_id: string | null;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  capacity: number | null;
  require_approval: boolean;
  tickets: LiteTicketInput[];
  questions: LiteQuestionInput[];
  upi_id: string | null;
  upi_name: string | null;
}

export const LITE_CREATE_EVENT: TypedDocumentNode<{ liteCreateEvent: LiteEvent }, { input: LiteEventInput }> = gql`
  mutation LiteCreateEvent($input: LiteEventInput!) {
    liteCreateEvent(input: $input) {
      ...LiteEventFields
    }
  }
  ${LITE_EVENT_FIELDS}
`;

export const LITE_UPDATE_EVENT: TypedDocumentNode<{ liteUpdateEvent: LiteEvent }, { id: string; input: LiteEventInput }> = gql`
  mutation LiteUpdateEvent($id: ID!, $input: LiteEventInput!) {
    liteUpdateEvent(id: $id, input: $input) {
      ...LiteEventFields
    }
  }
  ${LITE_EVENT_FIELDS}
`;

export const LITE_PUBLISH_EVENT: TypedDocumentNode<{ litePublishEvent: LiteEvent }, { id: string }> = gql`
  mutation LitePublishEvent($id: ID!) {
    litePublishEvent(id: $id) {
      ...LiteEventFields
    }
  }
  ${LITE_EVENT_FIELDS}
`;

export const LITE_CANCEL_EVENT: TypedDocumentNode<{ liteCancelEvent: LiteEvent }, { id: string; reason?: string | null }> = gql`
  mutation LiteCancelEvent($id: ID!, $reason: String) {
    liteCancelEvent(id: $id, reason: $reason) {
      ...LiteEventFields
    }
  }
  ${LITE_EVENT_FIELDS}
`;

export const LITE_DUPLICATE_EVENT: TypedDocumentNode<{ liteDuplicateEvent: LiteEvent }, { id: string }> = gql`
  mutation LiteDuplicateEvent($id: ID!) {
    liteDuplicateEvent(id: $id) {
      ...LiteEventFields
    }
  }
  ${LITE_EVENT_FIELDS}
`;
