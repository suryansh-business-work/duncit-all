import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  MutationSendVenueChatMessageArgs,
  QueryVenueChatMessagesArgs,
  QueryVenueChatRoomArgs,
  VenueChatRoom,
} from '@duncit/gql-types';
import {
  SEND_VENUE_CHAT_MESSAGE_SDL,
  VENUE_CHAT_MESSAGES_SDL,
  VENUE_CHAT_ROOM_SDL,
  type VenueChatLine,
} from '@duncit/utils';

/** The thread a venue booking's hosts and venue share — who it is with, and your side. */
export const VENUE_CHAT_ROOM: TypedDocumentNode<
  { venueChatRoom: Omit<VenueChatRoom, '__typename'> },
  QueryVenueChatRoomArgs
> = gql(VENUE_CHAT_ROOM_SDL);

/** One page of the thread's lines, oldest first. */
export const VENUE_CHAT_MESSAGES: TypedDocumentNode<
  { venueChatMessages: VenueChatLine[] },
  QueryVenueChatMessagesArgs
> = gql(VENUE_CHAT_MESSAGES_SDL);

/** Posts a text line or a photo; answers the line as everyone will see it. */
export const SEND_VENUE_CHAT_MESSAGE: TypedDocumentNode<
  { sendVenueChatMessage: VenueChatLine },
  MutationSendVenueChatMessageArgs
> = gql(SEND_VENUE_CHAT_MESSAGE_SDL);
