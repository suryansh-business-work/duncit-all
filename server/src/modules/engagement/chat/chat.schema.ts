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

  "A chat line in a pod's room (pod_id) or a club's room (club_id) — exactly one is set."
  type PodMessage {
    id: ID!
    pod_id: ID
    club_id: ID
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
    "When this room's messages are permanently deleted: the pod's end plus the admin-set chat retention. Null when the pod has no usable start."
    chat_deletes_at: String
    "Whether the pod has ended, which closes the room to new messages."
    closed: Boolean!
  }

  type PodChatInfo {
    "When this room's messages are permanently deleted. Null when the pod has no usable start."
    chat_deletes_at: String
    "Whether the pod has ended, which closes the room to new messages."
    closed: Boolean!
    "Whether the viewer may remove other members' messages (a host of the pod)."
    can_moderate: Boolean!
  }

  "A club's chat room, for everyone who joined the club plus its admins and hosts."
  type ClubChatRoom {
    id: ID!
    club_id: ID!
    "The club's URL slug (Club.club_id)."
    club_slug: String!
    club_name: String!
    cover_url: String
    super_category_id: ID
    "Messages older than this many days are permanently deleted (Clubs > Club Settings)."
    retention_days: Int!
    "Whether the viewer may remove other members' messages (a club admin)."
    can_moderate: Boolean!
    last_message_at: String
    last_message_preview: String
    last_message_type: PodMessageType
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
    "A pod room's retention and moderation facts, for its members."
    podChatInfo(pod_id: ID!): PodChatInfo!
    "Club chat rooms the caller can open (joined, admin or host)."
    myClubChatRooms: [ClubChatRoom!]!
    "One club's chat room header, for members only."
    clubChatRoom(club_id: ID!): ClubChatRoom!
    clubMessages(club_id: ID!, limit: Int, before: String): [PodMessage!]!
  }

  extend type Mutation {
    sendPodMessage(
      pod_id: ID!
      type: PodMessageType
      text: String
      image_url: String
    ): PodMessage!
    sendClubMessage(
      club_id: ID!
      type: PodMessageType
      text: String
      image_url: String
    ): PodMessage!
    "Toggles a reaction on a pod OR club chat message."
    reactToPodMessage(message_id: ID!, emoji: String!): PodMessage!
    "Removes a pod OR club chat message: your own, or anyone's in a room you moderate."
    deletePodMessage(message_id: ID!): PodMessage
  }
`;
