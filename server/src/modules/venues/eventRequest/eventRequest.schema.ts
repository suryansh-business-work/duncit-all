import gql from 'graphql-tag';

export const eventRequestTypeDefs = gql`
  "Who an event request is addressed to: a host (by their user id) or a venue."
  enum EventRequestTarget {
    HOST
    VENUE
  }

  "OPEN until the target publishes a pod (FULFILLED) or its owner dismisses it."
  enum EventRequestStatus {
    OPEN
    FULFILLED
    DISMISSED
  }

  "A member's ask that a host or venue with nothing upcoming runs an event."
  type EventRequest {
    id: ID!
    target_type: EventRequestTarget!
    target_id: ID!
    target_name: String!
    requester_id: ID!
    requester_name: String!
    note: String!
    status: EventRequestStatus!
    "The pod whose going live answered this request."
    fulfilled_pod_id: ID
    closed_at: String
    created_at: String!
  }

  type EventRequestTablePage {
    rows: [EventRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type EventRequestCounts {
    open: Int!
    fulfilled: Int!
    dismissed: Int!
    total: Int!
  }

  "The signed-in member's own open request to one host or venue."
  type MyEventRequestState {
    "True on the caller's own venue or host page — there is nobody to ask."
    is_owner: Boolean!
    requested: Boolean!
    request_id: ID
    requested_at: String
  }

  input RequestEventInput {
    target_type: EventRequestTarget!
    target_id: ID!
    "Optional, up to 280 characters."
    note: String
  }

  extend type Query {
    "Whether the signed-in member already has an open request to this host or venue."
    myEventRequestState(target_type: EventRequestTarget!, target_id: ID!): MyEventRequestState!
    "Requests addressed to the caller: the venues they own (VENUE) or themself as host (HOST)."
    myReceivedEventRequestsTable(target_type: EventRequestTarget!, query: TableQueryInput): EventRequestTablePage!
    myReceivedEventRequestCounts(target_type: EventRequestTarget!): EventRequestCounts!
    "Every request of one kind — the Venues console (VENUE) or the Hosts console (HOST)."
    eventRequestsTable(target_type: EventRequestTarget!, query: TableQueryInput): EventRequestTablePage!
    eventRequestCounts(target_type: EventRequestTarget!): EventRequestCounts!
  }

  extend type Mutation {
    """
    Ask a host or venue for an event. Idempotent: a member with an open request
    to this target gets that request back instead of a second one.
    """
    requestEvent(input: RequestEventInput!): MyEventRequestState!
    "Close an OPEN request as FULFILLED or DISMISSED — its owner or the console's editors."
    updateEventRequestStatus(id: ID!, status: EventRequestStatus!): EventRequest!
  }
`;
