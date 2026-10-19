import { gql } from '@/generated/graphql';

/** The pods/clubs the signed-in user can chat in — the Chats thread list. */
export const ChatRoomsDocument = gql(`
  query MobileChatRooms {
    myChatRooms {
      id
      pod_id
      pod_slug
      pod_title
      pod_date_time
      pod_end_date_time
      no_of_spots
      pod_attendees
      cover_url
      club_id
      club_slug
      super_category_id
      unread_count
    }
  }
`);

/** Host(s) + participants of a chat room, for the detail people panel. */
export const ChatParticipantsDocument = gql(`
  query MobileChatParticipants($podId: ID!) {
    chatParticipants(pod_id: $podId) {
      participant_count
      hosts {
        user_id
        full_name
        profile_photo
      }
      participants {
        user_id
        full_name
        profile_photo
      }
    }
  }
`);

/** One chat line — a pod room's or a club room's; the bubble reads these. */
export const ChatMessageFieldsFragment = gql(`
  fragment MobileChatMessageFields on PodMessage {
    id
    pod_id
    club_id
    user_id
    user_name
    user_photo
    type
    text
    image_url
    reactions {
      user_id
      emoji
    }
    deleted
    createdAt
    reply_to_id
    reply_to {
      id
      user_id
      user_name
      text
      type
      deleted
    }
    mentions
    mention_users {
      user_id
      full_name
    }
  }
`);

/** Recent messages in a room. Newest-last is handled in the UI. Mirrors mWeb's
 * POD_MESSAGES (reactions + deleted included for the live room). */
export const PodMessagesDocument = gql(`
  query MobilePodMessages($podId: ID!, $limit: Int) {
    podMessages(pod_id: $podId, limit: $limit) {
      ...MobileChatMessageFields
    }
    pod(pod_doc_id: $podId) {
      id
      pod_title
      pod_date_time
      pod_end_date_time
    }
    podChatInfo(pod_id: $podId) {
      chat_deletes_at
      closed
      can_moderate
      is_muted
      muted_until
    }
  }
`);

/** A club's room: the same message fields as a pod's, plus its header. */
export const ClubMessagesDocument = gql(`
  query MobileClubMessages($clubId: ID!, $limit: Int) {
    clubMessages(club_id: $clubId, limit: $limit) {
      ...MobileChatMessageFields
    }
    clubChatRoom(club_id: $clubId) {
      id
      club_slug
      club_name
      retention_days
      can_moderate
      is_muted
      muted_until
    }
  }
`);

/** One older page of a pod's room, for scroll-up history. Only the lines: the
 * room's facts already came with the newest page. */
export const PodMessagesPageDocument = gql(`
  query MobilePodMessagesPage($podId: ID!, $limit: Int, $before: String) {
    podMessages(pod_id: $podId, limit: $limit, before: $before) {
      ...MobileChatMessageFields
    }
  }
`);

/** One older page of a club's room — the club twin of PodMessagesPageDocument. */
export const ClubMessagesPageDocument = gql(`
  query MobileClubMessagesPage($clubId: ID!, $limit: Int, $before: String) {
    clubMessages(club_id: $clubId, limit: $limit, before: $before) {
      ...MobileChatMessageFields
    }
  }
`);

/** Club rooms the user can open — the Chats screen's Clubs tab. */
export const ClubChatRoomsDocument = gql(`
  query MobileClubChatRooms {
    myClubChatRooms {
      id
      club_name
      cover_url
      super_category_id
      last_message_at
      last_message_preview
      last_message_type
      unread_count
    }
  }
`);

/** Post to a club room — the club twin of SendPodMessageDocument. */
export const SendClubMessageDocument = gql(`
  mutation MobileSendClubMessage(
    $clubId: ID!
    $type: PodMessageType
    $text: String
    $imageUrl: String
    $replyToId: ID
    $mentions: [ID!]
  ) {
    sendClubMessage(
      club_id: $clubId
      type: $type
      text: $text
      image_url: $imageUrl
      reply_to_id: $replyToId
      mentions: $mentions
    ) {
      id
    }
  }
`);

/** Remove a message: your own, or anyone's in a room you moderate. */
export const DeleteChatMessageDocument = gql(`
  mutation MobileDeleteChatMessage($messageId: ID!) {
    deletePodMessage(message_id: $messageId) {
      id
      deleted
    }
  }
`);

/** Post a message to a pod room — mWeb's SEND_MSG. The server echoes it back
 * over the socket `message` event, so the sender sees it like everyone else. */
export const SendPodMessageDocument = gql(`
  mutation MobileSendPodMessage(
    $podId: ID!
    $type: PodMessageType
    $text: String
    $imageUrl: String
    $replyToId: ID
    $mentions: [ID!]
  ) {
    sendPodMessage(
      pod_id: $podId
      type: $type
      text: $text
      image_url: $imageUrl
      reply_to_id: $replyToId
      mentions: $mentions
    ) {
      id
    }
  }
`);

/** Toggle an emoji reaction on a message — mWeb's REACT_MSG. */
export const ReactToPodMessageDocument = gql(`
  mutation MobileReactToPodMessage($messageId: ID!, $emoji: String!) {
    reactToPodMessage(message_id: $messageId, emoji: $emoji) {
      id
      reactions {
        user_id
        emoji
      }
    }
  }
`);

/** A pod's or a club's history for the chat card on its details — any signed-in
 * viewer, read-only. Mirrors mWeb's CHAT_PREVIEW. */
export const ChatPreviewDocument = gql(`
  query MobileChatPreview($podId: ID, $clubId: ID, $limit: Int, $before: String) {
    chatPreview(pod_id: $podId, club_id: $clubId, limit: $limit, before: $before) {
      messages {
        id
        user_id
        user_name
        user_photo
        type
        text
        createdAt
      }
      total_count
      is_member
      closed
    }
  }
`);
