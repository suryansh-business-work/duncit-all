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
  }

  extend type Query {
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
