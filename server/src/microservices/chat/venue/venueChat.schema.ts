export const venueChatTypeDefs = /* GraphQL */ `
  "Which side of a venue booking's chat a member is on."
  enum VenueChatSide {
    HOST
    VENUE
  }

  "The private chat between a pod's hosts and the venue it is booked at."
  type VenueChatRoom {
    "The pod the thread belongs to."
    pod_id: ID!
    pod_title: String!
    pod_date_time: String
    venue_id: ID!
    venue_name: String!
    venue_photo: String
    "The caller's side."
    my_side: VenueChatSide!
    "A free pod: its host settles the venue directly, so offer lines name no money."
    pod_is_free: Boolean!
    "Who the caller is talking to: the pod's lead host for the venue, the venue's listed contact for a host."
    counterpart_name: String
    "Their phone, with its country code. Null when none is on record."
    counterpart_phone: String
    "Their email. Null when none is on record."
    counterpart_email: String
  }

  "One move of a booking offer, as a venue chat OFFER line records it (money in rupees)."
  type VenueChatOffer {
    slot_id: ID!
    round: Int!
    "OFFER, COUNTER, ACCEPTED, DECLINED or EXPIRED."
    event: String!
    "HOST, VENUE, or SYSTEM for an answer that ran late."
    by: String!
    "The pricing model of the terms on the table (VenueOfferModel)."
    model: String!
    rate: Float!
    min_guests: Int!
    max_guests: Int!
    offerings: [String!]!
    note: String!
    start_at: String!
    end_at: String!
    space_label: String!
    pets: Boolean!
    "What the venue is paid at the fewest and the most guests."
    venue_receives_min: Float!
    venue_receives_max: Float!
    "What the booking costs the pod (the venue's amount plus Duncit's commission) at the fewest and the most guests."
    total_min: Float!
    total_max: Float!
    "When the other side must answer by; null once the offer is closed."
    expires_at: String
    reason: String!
  }

  "A venue booking's chat in an inbox list, newest activity first."
  type VenueChatThread {
    pod_id: ID!
    pod_title: String!
    pod_date_time: String
    venue_id: ID!
    venue_name: String!
    "The pod's lead host."
    host_name: String!
    host_photo: String
    "The newest line's text; null while nobody has written, empty for a photo."
    last_message: String
    last_message_is_photo: Boolean!
    last_message_at: String
    last_message_side: VenueChatSide
    "Lines from the other side since the caller last opened the thread (always 0 for staff)."
    unread_count: Int!
  }

  type VenueChatThreadPage {
    rows: [VenueChatThread!]!
    total: Int!
  }

  extend type Query {
    "The venue owner's chats with the hosts of pods at their venues (one venue, or all of theirs)."
    myVenueChatThreads(venue_id: ID, limit: Int, offset: Int): VenueChatThreadPage!
    "Duncit staff: one venue's chats (Venues console, read-only)."
    adminVenueChatThreads(venue_id: ID!, limit: Int, offset: Int): VenueChatThreadPage!
    "Duncit staff: one venue chat's lines, read-only."
    adminVenueChatMessages(pod_id: ID!, limit: Int, before: String): [PodMessage!]!
    "A venue booking's chat — only its hosts and the venue's owner may read it."
    venueChatRoom(pod_id: ID!): VenueChatRoom!
    "One page of the thread, oldest first: the newest \`limit\` before \`before\`."
    venueChatMessages(pod_id: ID!, limit: Int, before: String): [PodMessage!]!
  }

  extend type Mutation {
    "Post to a venue booking's chat (TEXT, or IMAGE with an uploaded https URL)."
    sendVenueChatMessage(pod_id: ID!, type: PodMessageType, text: String, image_url: String): PodMessage!
  }
`;
