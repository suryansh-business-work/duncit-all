import { gql } from '@/generated/graphql';

/** The pods/clubs the signed-in user can chat in — the Chats thread list. */
export const ChatRoomsDocument = gql(`
  query MobileChatRooms {
    myChatRooms {
      id
      pod_id
      pod_title
      pod_date_time
      no_of_spots
      pod_attendees
      cover_url
      club_id
    }
  }
`);

/** Recent messages in a room. Newest-last is handled in the UI. Mirrors mWeb's
 * POD_MESSAGES (reactions + deleted included for the live room). */
export const PodMessagesDocument = gql(`
  query MobilePodMessages($podId: ID!, $limit: Int) {
    podMessages(pod_id: $podId, limit: $limit) {
      id
      pod_id
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
  ) {
    sendPodMessage(pod_id: $podId, type: $type, text: $text, image_url: $imageUrl) {
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
