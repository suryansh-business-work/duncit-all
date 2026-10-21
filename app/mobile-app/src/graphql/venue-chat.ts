import { gql } from '@/generated/graphql';

/**
 * The private thread between a pod's hosts and its venue — the same operations
 * mWeb sends (`@duncit/utils` VENUE_CHAT_*_SDL, rule 29), written out because
 * the app's codegen reads these templates statically. Lines use the group
 * chat's own fragment, so the room's bubbles render them unchanged.
 */

/** Who the thread is with, and the reader's side (HOST / VENUE). */
export const VenueChatRoomDocument = gql(`
  query MobileVenueChatRoom($podId: ID!) {
    venueChatRoom(pod_id: $podId) {
      pod_id
      pod_title
      pod_date_time
      venue_id
      venue_name
      venue_photo
      my_side
    }
  }
`);

/** One page of the thread, oldest first: the newest page, or the one before `before`. */
export const VenueChatMessagesDocument = gql(`
  query MobileVenueChatMessages($podId: ID!, $limit: Int, $before: String) {
    venueChatMessages(pod_id: $podId, limit: $limit, before: $before) {
      ...MobileChatMessageFields
    }
  }
`);

/** Posts a text line or an uploaded photo; answers the line as both sides see it. */
export const SendVenueChatMessageDocument = gql(`
  mutation MobileSendVenueChatMessage(
    $podId: ID!
    $type: PodMessageType
    $text: String
    $imageUrl: String
  ) {
    sendVenueChatMessage(pod_id: $podId, type: $type, text: $text, image_url: $imageUrl) {
      ...MobileChatMessageFields
    }
  }
`);
