import { gql } from '@/generated/graphql';

/**
 * The private thread between a pod's hosts and its venue — the same operations
 * mWeb sends (`@duncit/utils` VENUE_CHAT_*_SDL, rule 29), written out because
 * the app's codegen reads these templates statically. Lines use the group
 * chat's own fragment, so the room's bubbles render them unchanged; an OFFER
 * line also carries the move of the booking offer it records.
 */

/** Who the thread is with, how to reach them, and the reader's side (HOST / VENUE). */
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
      pod_is_free
      counterpart_name
      counterpart_phone
      counterpart_email
    }
  }
`);

/** A thread's line: the group chat's fields and, on an OFFER line, the move (money in rupees). */
export const VenueChatLineFragment = gql(`
  fragment MobileVenueChatLine on PodMessage {
    ...MobileChatMessageFields
    offer {
      slot_id
      round
      event
      by
      model
      rate
      min_guests
      max_guests
      offerings
      note
      start_at
      end_at
      space_label
      pets
      venue_receives_min
      venue_receives_max
      total_min
      total_max
      expires_at
      reason
    }
  }
`);

/** One page of the thread, oldest first: the newest page, or the one before `before`. */
export const VenueChatMessagesDocument = gql(`
  query MobileVenueChatMessages($podId: ID!, $limit: Int, $before: String) {
    venueChatMessages(pod_id: $podId, limit: $limit, before: $before) {
      ...MobileVenueChatLine
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
      ...MobileVenueChatLine
    }
  }
`);

/**
 * What the resubmit sheet edits when a host sends a new offer from the thread
 * after one was declined or ran out: the pod's own details (mWeb:
 * VENUE_CHAT_RESUBMIT_POD).
 */
export const VenueChatResubmitPodDocument = gql(`
  query MobileVenueChatResubmitPod($podId: ID!) {
    pod(pod_doc_id: $podId) {
      id
      pod_title
      pod_description
      pod_images_and_videos {
        url
        type
      }
      venue_id
      no_of_spots
    }
  }
`);

/** The owner's chat inbox for one venue (mWeb: MY_VENUE_CHAT_THREADS_SDL). */
export const MyVenueChatThreadsDocument = gql(`
  query MobileMyVenueChatThreads($venueId: ID, $limit: Int, $offset: Int) {
    myVenueChatThreads(venue_id: $venueId, limit: $limit, offset: $offset) {
      rows {
        pod_id
        pod_title
        pod_date_time
        venue_id
        venue_name
        host_name
        host_photo
        last_message
        last_message_is_photo
        last_message_at
        last_message_side
        unread_count
      }
      total
    }
  }
`);
