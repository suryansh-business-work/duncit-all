export const chatTypeDefs = /* GraphQL */ `
  enum PodMessageType {
    TEXT
    IMAGE
    STICKER
    SYSTEM
  }

  type PodMessageReaction {
    user_id: ID!
    emoji: String!
  }

  type PodMessage {
    id: ID!
    pod_id: ID!
    user_id: ID!
    user_name: String
    user_photo: String
    type: PodMessageType!
    text: String
    image_url: String
    reactions: [PodMessageReaction!]!
    deleted: Boolean!
    createdAt: String!
  }

  type ChatRoom {
    id: ID!
    pod_id: ID
    "The pod's URL slug (Pod.pod_id) for linking to its detail page."
    pod_slug: String
    pod_title: String!
    pod_date_time: String
    "End time (or null) — clients bucket Upcoming vs Previous from these."
    pod_end_date_time: String
    pod_attendees: [ID!]!
    no_of_spots: Int
    club_id: ID
    "The club's URL slug (Club.club_id) for building the pod detail path."
    club_slug: String
    "Super category the linked club maps to (For You / For Your Pet classification)."
    super_category_id: ID
    cover_url: String
  }

  "A host or participant shown in the chat detail people panel."
  type ChatUser {
    user_id: ID!
    full_name: String!
    profile_photo: String
  }

  type ChatParticipants {
    hosts: [ChatUser!]!
    participants: [ChatUser!]!
    participant_count: Int!
  }

  extend type Query {
    myChatRooms: [ChatRoom!]!
    "Host(s) and participants of a pod's chat (members only)."
    chatParticipants(pod_id: ID!): ChatParticipants!
    podMessages(pod_id: ID!, limit: Int, before: String): [PodMessage!]!
  }

  extend type Mutation {
    sendPodMessage(
      pod_id: ID!
      type: PodMessageType
      text: String
      image_url: String
    ): PodMessage!
    reactToPodMessage(message_id: ID!, emoji: String!): PodMessage!
    deletePodMessage(message_id: ID!): PodMessage
  }
`;
