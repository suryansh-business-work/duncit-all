import { gql, type TypedDocumentNode } from '@apollo/client';
import {
  ADMIN_VENUE_CHAT_MESSAGES_SDL,
  ADMIN_VENUE_CHAT_THREADS_SDL,
  type VenueChatLine,
  type VenueChatThreadRow,
} from '@duncit/utils';

/** One venue's chats with its pods' hosts (staff, read-only). */
export const ADMIN_VENUE_CHAT_THREADS: TypedDocumentNode<
  { adminVenueChatThreads: { rows: VenueChatThreadRow[]; total: number } },
  { venue_id: string; limit?: number | null; offset?: number | null }
> = gql(ADMIN_VENUE_CHAT_THREADS_SDL);

/** One of those chats, line by line (staff, read-only). */
export const ADMIN_VENUE_CHAT_MESSAGES: TypedDocumentNode<
  { adminVenueChatMessages: VenueChatLine[] },
  { pod_id: string; limit?: number | null; before?: string | null }
> = gql(ADMIN_VENUE_CHAT_MESSAGES_SDL);
