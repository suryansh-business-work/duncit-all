export const bouncerTypeDefs = /* GraphQL */ `
  enum BouncerSosStatus {
    ACTIVE
    ACKNOWLEDGED
    RESOLVED
  }

  enum BouncerCallbackStatus {
    PENDING
    CONTACTED
    CLOSED
  }

  enum BouncerFeedbackCategory {
    VENUE
    HOST
    SAFETY
    FOOD
    OTHER
  }

  type BouncerGeo {
    lat: Float!
    lng: Float!
    accuracy: Float
  }

  input BouncerGeoInput {
    lat: Float!
    lng: Float!
    accuracy: Float
  }

  type BouncerActor {
    id: ID!
    name: String!
    phone: String
    avatar_url: String
  }

  type BouncerPodInfo {
    id: ID!
    title: String!
    venue_id: ID
    venue_name: String
    club_id: ID
    club_name: String
    starts_at: String
  }

  type BouncerSosAlert {
    id: ID!
    "Human-readable reference, e.g. SOS-A1B2C3."
    ticket_no: String!
    user: BouncerActor!
    host: BouncerActor
    pod: BouncerPodInfo!
    location: BouncerGeo
    message: String!
    contact_phone: String!
    status: BouncerSosStatus!
    acknowledged_by_id: ID
    acknowledged_at: String
    resolved_at: String
    created_at: String!
  }

  type BouncerCallbackRequest {
    id: ID!
    "Human-readable reference, e.g. CB-A1B2C3."
    ticket_no: String!
    user: BouncerActor!
    pod: BouncerPodInfo
    contact_phone: String!
    reason: String!
    status: BouncerCallbackStatus!
    contacted_at: String
    "Call length in seconds, recorded by the agent."
    duration_seconds: Int
    "How the call concluded, recorded by the agent."
    conclusion: String
    created_at: String!
  }

  type BouncerFeedback {
    id: ID!
    user: BouncerActor!
    host: BouncerActor
    pod: BouncerPodInfo!
    rating: Int!
    category: BouncerFeedbackCategory!
    message: String!
    created_at: String!
  }

  input RaiseSosInput {
    pod_id: ID!
    message: String
    location: BouncerGeoInput
  }

  input RequestCallbackInput {
    pod_id: ID
    reason: String
  }

  input SubmitBouncerFeedbackInput {
    pod_id: ID!
    rating: Int!
    category: BouncerFeedbackCategory!
    message: String
  }

  type BouncerSupportTarget {
    phone: String!
    available: Boolean!
  }

  "A page of SOS alerts for the agent list (server-side pagination + sort + search)."
  type BouncerSosAlertPage {
    items: [BouncerSosAlert!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "A page of callback requests for the agent list (server-side pagination + sort + search)."
  type BouncerCallbackRequestPage {
    items: [BouncerCallbackRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    bouncerSupportTarget: BouncerSupportTarget!
    bouncerSosAlerts(
      status: BouncerSosStatus
      search: String
      page: Int
      page_size: Int
      sort_by: String
      sort_dir: String
    ): BouncerSosAlertPage!
    bouncerCallbackRequests(
      status: BouncerCallbackStatus
      search: String
      page: Int
      page_size: Int
      sort_by: String
      sort_dir: String
    ): BouncerCallbackRequestPage!
    "A single SOS alert by id — backs the agent SOS detail page (deep-linkable)."
    bouncerSosAlert(id: ID!): BouncerSosAlert
    "A single callback request by id — backs the agent callback detail page (deep-linkable)."
    bouncerCallbackRequest(id: ID!): BouncerCallbackRequest
    bouncerFeedback(limit: Int): [BouncerFeedback!]!
    myActiveBouncerSos(pod_id: ID!): BouncerSosAlert
    "The signed-in user's own callback request history, newest first."
    myCallbackRequests(limit: Int): [BouncerCallbackRequest!]!
    "An attended (past) pod the user has not yet rated — drives the post-pod feedback pop-up."
    myPendingPodFeedback: BouncerPodInfo
  }

  extend type Mutation {
    raiseBouncerSos(input: RaiseSosInput!): BouncerSosAlert!
    acknowledgeBouncerSos(id: ID!): BouncerSosAlert!
    resolveBouncerSos(id: ID!): BouncerSosAlert!
    requestBouncerCallback(input: RequestCallbackInput!): BouncerCallbackRequest!
    markBouncerCallbackContacted(
      id: ID!
      duration_seconds: Int
      conclusion: String
    ): BouncerCallbackRequest!
    closeBouncerCallback(
      id: ID!
      duration_seconds: Int
      conclusion: String
    ): BouncerCallbackRequest!
    submitBouncerFeedback(input: SubmitBouncerFeedbackInput!): BouncerFeedback!
  }
`;
