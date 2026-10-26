export const chatTypeDefs = /* GraphQL */ `
  enum PodMessageType {
    TEXT
    IMAGE
    STICKER
    SYSTEM
    "A venue chat line recording a move in the booking offer (see offer); its text is a one-line summary."
    OFFER
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
    "The message this one replies to (same room), or null."
    reply_to_id: ID
    "The quoted line of a reply, read now — deleted (no text) when the original is gone."
    reply_to: PodMessageReplyTo
    "Ids of the members this message @-mentions."
    mentions: [ID!]!
    "The mentioned members, named now, so a bubble can find and link each @token."
    mention_users: [ChatUser!]!
    "An OFFER line's terms (venue chat only); null on every other line."
    offer: VenueChatOffer
    "When the author last changed the line (venue chat only); null while it is as first sent."
    edited_at: String
  }

  "The quoted line shown inside a reply."
  type PodMessageReplyTo {
    id: ID!
    user_id: ID!
    user_name: String
    text: String
    type: PodMessageType!
    deleted: Boolean!
  }

  "Which room a mute or a read mark is about."
  enum ChatRoomKind {
    POD
    CLUB
    SUPPORT
  }

  "How long a chat stays muted. ALWAYS lasts until it is unmuted."
  enum ChatMuteDuration {
    EIGHT_HOURS
    ONE_WEEK
    ALWAYS
  }

  "One member's mute of one room."
  type ChatMuteState {
    kind: ChatRoomKind!
    id: ID!
    is_muted: Boolean!
    "When the mute ends (ISO); null while muted means Always."
    muted_until: String
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
    "Lines the viewer has not read yet (a never-opened room counts the last week)."
    unread_count: Int!
    "Whether the viewer muted this room's notifications."
    is_muted: Boolean!
    muted_until: String
  }

  type PodChatInfo {
    "When this room's messages are permanently deleted. Null when the pod has no usable start."
    chat_deletes_at: String
    "Whether the pod has ended, which closes the room to new messages."
    closed: Boolean!
    "Whether the viewer may remove other members' messages (a host of the pod)."
    can_moderate: Boolean!
    "Whether the viewer muted this room's notifications."
    is_muted: Boolean!
    muted_until: String
  }

  "A pod's or club's chat history, read-only, for anyone signed in looking at its details page."
  type ChatPreview {
    "One page of messages, oldest first — the newest ones, or those older than the before time."
    messages: [PodMessage!]!
    "Every message the viewer can see in the room, in all."
    total_count: Int!
    "Whether the viewer may open the room and post (a member)."
    is_member: Boolean!
    "Whether the pod has ended, which closes its room. A club's room never closes."
    closed: Boolean!
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
    "Lines the viewer has not read yet (a never-opened room counts the last week)."
    unread_count: Int!
    "Whether the viewer muted this room's notifications."
    is_muted: Boolean!
    muted_until: String
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
    "A pod's (pod_id) or club's (club_id) chat history for its details page — any signed-in viewer."
    chatPreview(pod_id: ID, club_id: ID, limit: Int, before: String): ChatPreview!
    "A club room's members whose name starts with search, for the @ list (members only)."
    clubChatMembers(club_id: ID!, search: String, limit: Int): [ChatUser!]!
    "The viewer's mute of one pod, club or support chat."
    chatMuteState(kind: ChatRoomKind!, id: ID!): ChatMuteState!
    "Unread lines across the viewer's pod and club rooms, muted rooms left out."
    chatUnreadTotal: Int!
  }

  extend type Mutation {
    sendPodMessage(
      pod_id: ID!
      type: PodMessageType
      text: String
      image_url: String
      "Reply to this message (it must be in the same room)."
      reply_to_id: ID
      "Members @-mentioned in the text (they must be in the room)."
      mentions: [ID!]
    ): PodMessage!
    sendClubMessage(
      club_id: ID!
      type: PodMessageType
      text: String
      image_url: String
      reply_to_id: ID
      mentions: [ID!]
    ): PodMessage!
    "Mutes a chat you can open. Muting again replaces the length."
    muteChat(kind: ChatRoomKind!, id: ID!, duration: ChatMuteDuration!): ChatMuteState!
    unmuteChat(kind: ChatRoomKind!, id: ID!): ChatMuteState!
    "Marks a pod or club room read up to now (on open, and while it stays open)."
    markChatRead(kind: ChatRoomKind!, id: ID!): Boolean!
    "Toggles a reaction on a pod OR club chat message."
    reactToPodMessage(message_id: ID!, emoji: String!): PodMessage!
    "Removes a pod OR club chat message: your own, or anyone's in a room you moderate."
    deletePodMessage(message_id: ID!): PodMessage
  }
`;
