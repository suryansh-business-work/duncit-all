import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  MutationSendVenueChatMessageArgs,
  QueryVenueChatMessagesArgs,
  QueryVenueChatRoomArgs,
  VenueChatRoom,
} from '@duncit/gql-types';
import {
  firstGraphQLError,
  SEND_VENUE_CHAT_MESSAGE_SDL,
  VENUE_CHAT_MESSAGES_SDL,
  VENUE_CHAT_ROOM_SDL,
  type VenueChatLine,
} from '@duncit/utils';

/**
 * The venue ↔ host chat for one pod. The operations are the shared ones in
 * @duncit/utils (mWeb and the app read the same three), typed here with the
 * generated schema types.
 */
export const VENUE_CHAT_ROOM: TypedDocumentNode<{ venueChatRoom: VenueChatRoom }, QueryVenueChatRoomArgs> =
  gql(VENUE_CHAT_ROOM_SDL);

export const VENUE_CHAT_MESSAGES: TypedDocumentNode<{ venueChatMessages: VenueChatLine[] }, QueryVenueChatMessagesArgs> =
  gql(VENUE_CHAT_MESSAGES_SDL);

export const SEND_VENUE_CHAT_MESSAGE: TypedDocumentNode<
  { sendVenueChatMessage: VenueChatLine },
  MutationSendVenueChatMessageArgs
> = gql(SEND_VENUE_CHAT_MESSAGE_SDL);

/** The Partners route a pod's chat opens on — the pod id stays in the URL. */
export const venueChatRoute = (podId: string): string => `/venues/pods/${encodeURIComponent(podId)}/chat`;

/** The partners app has no socket client, so an open thread re-reads its latest page this often. */
export const VENUE_CHAT_POLL_MS = 10_000;

/** The server's own cap on one line (`MAX_TEXT` in the venue chat service). */
export const VENUE_CHAT_TEXT_MAX = 2000;

/** A refusal's copy key: a non-member reads why, anything else reads "could not load". */
export function venueChatErrorKey(err: unknown): string {
  return firstGraphQLError(err)?.extensions?.code === 'FORBIDDEN'
    ? 'mweb.venueChat.unavailable'
    : 'mweb.venueChat.loadFailed';
}
