import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  MutationSendVenueChatMessageArgs,
  QueryPodArgs,
  QueryVenueChatMessagesArgs,
  QueryVenueChatRoomArgs,
  VenueChatRoom,
} from '@duncit/gql-types';
import type { HostPodTarget } from '@duncit/host-pod-actions';
import {
  SEND_VENUE_CHAT_MESSAGE_SDL,
  VENUE_CHAT_MESSAGES_SDL,
  VENUE_CHAT_ROOM_SDL,
  type VenueChatLine,
} from '@duncit/utils';

/** The thread a venue booking's hosts and venue share — who it is with, how to reach them, and your side. */
export const VENUE_CHAT_ROOM: TypedDocumentNode<
  { venueChatRoom: Omit<VenueChatRoom, '__typename'> },
  QueryVenueChatRoomArgs
> = gql(VENUE_CHAT_ROOM_SDL);

/** One page of the thread's lines, oldest first — an OFFER line carries its move. */
export const VENUE_CHAT_MESSAGES: TypedDocumentNode<
  { venueChatMessages: VenueChatLine[] },
  QueryVenueChatMessagesArgs
> = gql(VENUE_CHAT_MESSAGES_SDL);

/** Posts a text line or a photo; answers the line as everyone will see it. */
export const SEND_VENUE_CHAT_MESSAGE: TypedDocumentNode<
  { sendVenueChatMessage: VenueChatLine },
  MutationSendVenueChatMessageArgs
> = gql(SEND_VENUE_CHAT_MESSAGE_SDL);

/**
 * What the resubmit dialog edits when a host sends a new offer from the thread
 * after one was declined or ran out: the pod's details, nothing else.
 */
export const VENUE_CHAT_RESUBMIT_POD: TypedDocumentNode<{ pod: HostPodTarget | null }, QueryPodArgs> = gql`
  query VenueChatResubmitPod($pod_doc_id: ID!) {
    pod(pod_doc_id: $pod_doc_id) {
      id
      pod_title
      pod_description
      pod_images_and_videos {
        url
        type
      }
      venue_id
      venue_approval_status
      no_of_spots
    }
  }
`;
