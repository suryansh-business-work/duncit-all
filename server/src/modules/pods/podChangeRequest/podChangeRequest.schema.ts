export const podChangeRequestTypeDefs = /* GraphQL */ `
  """
  Which of a pod's three partner places a change request is about. There is no
  per-pod club-admin field: CLUB_ADMIN means the admin of the pod's CLUB.
  """
  enum PodChangeRole {
    VENUE
    HOST
    CLUB_ADMIN
  }

  enum PodChangeStatus {
    OPEN
    OFFERED
    RESOLVED
    WITHDRAWN
  }

  enum PodChangeResolution {
    NONE
    REPLACED
    POD_CANCELLED
  }

  enum PodChangeOfferStatus {
    PENDING
    APPROVED
    PASSED
  }

  enum PodChangeDecision {
    APPROVE
    PASS
  }

  "How to reach a partner. Phone prefers their WhatsApp number over the account's."
  type PodChangeContact {
    user_id: ID!
    full_name: String!
    email: String!
    phone: String!
  }

  "The pod a request is about, named the way every surface links to it."
  type PodChangePod {
    id: ID!
    pod_slug: String!
    pod_title: String!
    pod_date_time: String!
    club_slug: String!
    "Seats taken RIGHT NOW — attendees plus the extra seats they bought."
    attendee_count: Int!
  }

  "The place, offered to one candidate."
  type PodChangeOffer {
    user_id: ID!
    display_name: String!
    contact: PodChangeContact!
    venue_id: ID
    venue_name: String!
    venue_slot_id: ID
    slot_start_at: String
    slot_end_at: String
    slot_price: Float!
    club_id: ID
    status: PodChangeOfferStatus!
    offered_at: String!
    responded_at: String
    pass_reason: String!
  }

  "One appended line of a request's history. Never edited."
  type PodChangeEvent {
    action: String!
    actor_name: String!
    note: String!
    at: String!
  }

  type PodChangeRequest {
    id: ID!
    change_request_no: String!
    role: PodChangeRole!
    status: PodChangeStatus!
    resolution: PodChangeResolution!
    reason: String!
    "Account Health points actually deducted when this was filed."
    health_penalty: Int!
    "Seats taken when it was filed, for the audit trail."
    attendees_at_request: Int!
    pod: PodChangePod!
    "True once the pod behind this request has been cancelled."
    pod_cancelled: Boolean!
    requested_by: PodChangeContact!
    from_venue_id: ID
    from_venue_name: String!
    from_club_id: ID
    from_club_name: String!
    offer: PodChangeOffer
    offer_history: [PodChangeOffer!]!
    events: [PodChangeEvent!]!
    created_at: String!
    resolved_at: String
  }

  type PodChangeRequestPage {
    total: Int!
    page: Int!
    page_size: Int!
    rows: [PodChangeRequest!]!
  }

  "A partner an admin may offer the place to, with everything needed to reach them."
  type PodChangeCandidate {
    "Row id: the VENUE for a venue request, the user otherwise."
    id: ID!
    user_id: ID!
    label: String!
    detail: String!
    full_name: String!
    email: String!
    phone: String!
    venue_id: ID
    club_id: ID
    club_name: String!
  }

  "A free slot at a candidate venue."
  type PodChangeSlot {
    id: ID!
    venue_id: ID!
    start_at: String!
    end_at: String
    price: Float!
    capacity: Int!
    space_label: String!
  }

  """
  The Change Requests section of a partner studio: what I asked for, what is
  waiting on me, and what each role's request currently costs in Account Health.
  """
  type PodChangeBoard {
    mine: [PodChangeRequest!]!
    incoming: [PodChangeRequest!]!
    venue_penalty: Int!
    host_penalty: Int!
    club_admin_penalty: Int!
  }

  input OfferPodChangeInput {
    request_id: ID!
    user_id: ID!
    "VENUE requests only — the venue being offered the pod."
    venue_id: ID
    "VENUE requests only — the slot it would run in."
    venue_slot_id: ID
  }

  extend type Query {
    "Admin: one role's queue of change requests, server-paged."
    podChangeRequests(role: PodChangeRole!, query: TableQueryInput): PodChangeRequestPage!
    "Admin: one request, for the assign drawer's header."
    podChangeRequest(id: ID!): PodChangeRequest!
    "Admin: partners matching this pod's category (and city, where they have one)."
    podChangeCandidates(request_id: ID!): [PodChangeCandidate!]!
    "Admin: free slots at a candidate venue, for a VENUE request."
    podChangeVenueSlots(request_id: ID!, venue_id: ID!): [PodChangeSlot!]!
    "The signed-in partner's Change Requests section."
    myPodChangeBoard: PodChangeBoard!
  }

  extend type Mutation {
    """
    File a change request for one of a pod's three places. Costs the Account
    Health points configured in Admin > Pods > Pod Settings, and only one may
    be open per pod per role.
    """
    requestPodChange(pod_doc_id: ID!, role: PodChangeRole!, reason: String): PodChangeRequest!
    "The requester pulling their request back, before anybody has been offered it."
    withdrawPodChange(request_id: ID!): PodChangeRequest!
    "Admin: offer the place to one matching partner. Nothing on the pod moves yet."
    offerPodChange(input: OfferPodChangeInput!): PodChangeRequest!
    """
    Admin: cancel the pod and refund every attendee instead of replacing anyone.
    Refunds are recorded against each payment; the money itself is returned by
    Finance, not by a live gateway call.
    """
    cancelPodForChange(request_id: ID!, reason: String!): PodChangeRequest!
    "The offered partner answering: APPROVE takes the place, PASS declines it."
    respondToPodChange(
      request_id: ID!
      decision: PodChangeDecision!
      reason: String
    ): PodChangeRequest!
  }
`;
