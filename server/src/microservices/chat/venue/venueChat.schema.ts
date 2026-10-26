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
    "The pod's lead host, for the contact sheet (both sides see it). Null when the pod has no host on record."
    host: VenueChatHostCard
    "The venue, for the contact sheet (both sides see it)."
    venue: VenueChatVenueCard!
    "How far every other member has read the thread — the faces drawn under the last line each has seen."
    read_marks: [VenueChatReadMark!]!
  }

  "The pod's lead host on a venue chat's contact sheet."
  type VenueChatHostCard {
    user_id: ID!
    name: String!
    photo: String
    "Their @handle, for their profile link; empty when they have none."
    username: String!
    bio: String!
    "With its country code; empty when none is on record."
    phone: String!
    email: String!
  }

  "The venue on a venue chat's contact sheet. name/phone/email are the person to ask for."
  type VenueChatVenueCard {
    venue_id: ID!
    venue_name: String!
    photo: String
    venue_type: String!
    capacity: Int!
    "Street, locality and city, as one line."
    address: String!
    name: String!
    phone: String!
    email: String!
  }

  "How far one member has read a venue chat. The venue's owner reads as the venue (its name and photo)."
  type VenueChatReadMark {
    user_id: ID!
    side: VenueChatSide!
    name: String!
    photo: String
    "Every line written at or before this time has been seen by them."
    last_read_at: String!
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
    "Photos the mover attached to a counter (uploaded from their device)."
    images: [String!]!
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
    "One page of the thread, oldest first: the newest \`limit\` before \`before\`. Reading the newest page marks the thread read unless mark_read is false."
    venueChatMessages(pod_id: ID!, limit: Int, before: String, mark_read: Boolean): [PodMessage!]!
  }

  extend type Mutation {
    "Post to a venue booking's chat (TEXT, or IMAGE with an uploaded https URL)."
    sendVenueChatMessage(pod_id: ID!, type: PodMessageType, text: String, image_url: String): PodMessage!
    "React to any line of a venue chat; the same emoji again takes the reaction back."
    reactToVenueChatMessage(message_id: ID!, emoji: String!): PodMessage!
    "The author rewrites their own text line; everyone sees it marked edited."
    editVenueChatMessage(message_id: ID!, text: String!): PodMessage!
    "The author removes their own text or photo line."
    deleteVenueChatMessage(message_id: ID!): Boolean!
    "The member has the thread open and read to the end: the other side sees their face move to the newest line."
    markVenueChatRead(pod_id: ID!): Boolean!
  }
`;
