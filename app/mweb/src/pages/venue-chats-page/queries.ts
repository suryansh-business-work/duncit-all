import { gql, type TypedDocumentNode } from '@apollo/client';
import type { QueryMyVenueChatThreadsArgs, VenueChatThreadPage } from '@duncit/gql-types';
import { MY_VENUE_CHAT_THREADS_SDL } from '@duncit/utils';

/** The owner's venue chat inbox for one venue — the shared operation, typed. */
export const MY_VENUE_CHAT_THREADS: TypedDocumentNode<
  { myVenueChatThreads: VenueChatThreadPage },
  QueryMyVenueChatThreadsArgs
> = gql(MY_VENUE_CHAT_THREADS_SDL);
