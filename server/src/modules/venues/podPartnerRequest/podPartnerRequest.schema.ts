import gql from 'graphql-tag';

export const podPartnerRequestTypeDefs = gql`
  enum PartnerRequestDirection {
    VENUE_TO_HOST
    HOST_TO_VENUE
  }

  """
  REQUESTED → ACCEPTED → SLOT_REQUESTED → SLOT_CONFIRMED → POD_CREATED; REJECTED and
  CANCELLED end it before a slot; EXPIRED when a held slot started with no pod.
  """
  enum PartnerRequestStatus {
    REQUESTED
    ACCEPTED
    SLOT_REQUESTED
    SLOT_CONFIRMED
    POD_CREATED
    REJECTED
    CANCELLED
    EXPIRED
  }

  enum PartnerSide {
    HOST
    VENUE
  }

  "A host as a venue sees them before any pod — no phone or email."
  type PartnerHostSummary {
    user_id: ID!
    name: String!
    photo_url: String!
    categories: [String!]!
  }

  "A venue as a host sees it before any pod — the place, not its owner's contact."
  type PartnerVenueSummary {
    id: ID!
    venue_name: String!
    category: String!
    venue_type: String!
    capacity: Int!
    locality: String!
    city: String!
    cover_image_url: String!
  }

  type PartnerRequestSlot {
    id: ID!
    start_at: String!
    end_at: String!
    whole_day: Boolean!
    price: Float!
    space_label: String!
  }

  "The other side's contact — only ever filled once the pod is created."
  type PartnerContact {
    phone: String!
    email: String!
    address: String
  }

  type PodPartnerRequest {
    id: ID!
    direction: PartnerRequestDirection!
    status: PartnerRequestStatus!
    "Which side the signed-in user is on."
    viewer_side: PartnerSide!
    note: String!
    distance_km: Float
    venue: PartnerVenueSummary
    host: PartnerHostSummary
    slot: PartnerRequestSlot
    pod_id: ID
    "Null until POD_CREATED — contact is never shared before the pod exists."
    contact: PartnerContact
    created_at: String!
    updated_at: String!
  }

  type NearbyHost {
    user_id: ID!
    name: String!
    photo_url: String!
    categories: [String!]!
    distance_km: Float!
    "Set while this venue and host already have a live request."
    open_request_status: PartnerRequestStatus
  }

  type NearbyVenue {
    id: ID!
    venue_name: String!
    category: String!
    venue_type: String!
    capacity: Int!
    locality: String!
    city: String!
    cover_image_url: String!
    distance_km: Float!
    open_request_status: PartnerRequestStatus
  }

  type PartnerRequestQuota {
    limit: Int!
    used: Int!
    remaining: Int!
  }

  input NearbyPartnerSearchInput {
    "The city selected in the location picker — the search centre."
    location_id: ID!
    "The area inside it, when one is selected."
    zone_name: String
    "0–10 km; default 5."
    radius_km: Float
    "Category ids at any level (Super, Category or Sub); empty = all."
    category_ids: [ID!]
  }

  input SendPodPartnerRequestInput {
    direction: PartnerRequestDirection!
    venue_id: ID!
    "Required for VENUE_TO_HOST; ignored for HOST_TO_VENUE (the sender is the host)."
    host_user_id: ID
    note: String
  }

  extend type Query {
    "Venue owner: approved hosts near the selected location, for one of their venues."
    nearbyHostsForVenue(venue_id: ID!, search: NearbyPartnerSearchInput!): [NearbyHost!]!
    "Active host: approved venues near the selected location."
    nearbyVenuesForHost(search: NearbyPartnerSearchInput!): [NearbyVenue!]!
    "The caller's Pod Requests on one side (venue_id narrows a venue owner's list)."
    myPodPartnerRequests(side: PartnerSide!, direction: PartnerRequestDirection, venue_id: ID): [PodPartnerRequest!]!
    "One Pod Request the caller is a party to."
    podPartnerRequest(id: ID!): PodPartnerRequest!
    "This month's sending allowance: as a host, or for one venue you own."
    podPartnerRequestQuota(side: PartnerSide!, venue_id: ID): PartnerRequestQuota!
  }

  extend type Mutation {
    "Send a Pod Request. LIMIT_REACHED past the monthly cap; CONFLICT if the pair already has a live one."
    sendPodPartnerRequest(input: SendPodPartnerRequestInput!): PodPartnerRequest!
    "Receiver: accept (true) or decline (false)."
    respondPodPartnerRequest(id: ID!, accept: Boolean!): PodPartnerRequest!
    "Sender: withdraw before it is answered."
    cancelPodPartnerRequest(id: ID!): PodPartnerRequest!
    "Receiver: pick one of the venue's open slots (held until the sender answers)."
    requestPodPartnerSlot(id: ID!, slot_id: ID!): PodPartnerRequest!
    "Sender: confirm (true) or decline (false) the picked slot."
    respondPodPartnerSlot(id: ID!, confirm: Boolean!): PodPartnerRequest!
  }
`;
