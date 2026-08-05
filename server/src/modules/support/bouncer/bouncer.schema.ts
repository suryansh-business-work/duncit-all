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
    CLUB_ADMIN
    OTHER
  }

  """
  The parts of a pod a guest is asked to score. OVERALL is the headline; the
  rest are asked only when the pod has them (no venue, no venue rating).
  """
  enum BouncerFeedbackAspect {
    OVERALL
    HOST
    VENUE
    CLUB_ADMIN
    SAFETY
    FOOD
    OTHER
  }

  type BouncerAspectRating {
    aspect: BouncerFeedbackAspect!
    rating: Int!
  }

  input BouncerAspectRatingInput {
    aspect: BouncerFeedbackAspect!
    rating: Int!
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
    """
    Which parts of THIS pod can be rated, in the order to ask them. The server
    decides, so the app, mWeb and the admin panel cannot disagree.
    """
    feedback_aspects: [BouncerFeedbackAspect!]!
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
    "The OVERALL score. Every rating has one, including the oldest."
    rating: Int!
    "Host, venue, club admin, safety, food — whichever the guest scored."
    ratings: [BouncerAspectRating!]!
    category: BouncerFeedbackCategory!
    message: String!
    created_at: String!
  }

  type PodAspectRating {
    aspect: BouncerFeedbackAspect!
    average: Float!
    count: Int!
  }

  "Everything guests said about one pod — averages, plus the ratings themselves."
  type PodFeedbackSummary {
    pod_id: ID!
    total: Int!
    overall_average: Float!
    aspects: [PodAspectRating!]!
    recent: [BouncerFeedback!]!
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
    "The OVERALL score, 1-5. The only one that is required."
    rating: Int!
    """
    Left out by the apps: the server reads it from the weakest score, so the
    guest is not asked to triage their own feedback.
    """
    category: BouncerFeedbackCategory
    message: String
    "Per-part scores. Anything the pod does not have is ignored."
    ratings: [BouncerAspectRatingInput!]
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
    "Ratings for one pod, rolled up — backs the admin pod page."
    podFeedbackSummary(pod_id: ID!, limit: Int): PodFeedbackSummary!
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
