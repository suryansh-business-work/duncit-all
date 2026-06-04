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

/** Recent messages in a room (read-only view). Newest-last is handled in the UI. */
export const PodMessagesDocument = gql(`
  query MobilePodMessages($podId: ID!, $limit: Int) {
    podMessages(pod_id: $podId, limit: $limit) {
      id
      user_id
      user_name
      user_photo
      type
      text
      image_url
      createdAt
    }
  }
`);
