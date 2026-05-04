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
    pod_title: String!
    pod_date_time: String
    pod_attendees: [ID!]!
    no_of_spots: Int
    club_id: ID
    cover_url: String
  }

  extend type Query {
    myChatRooms: [ChatRoom!]!
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
