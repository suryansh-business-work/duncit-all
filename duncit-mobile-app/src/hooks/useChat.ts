import { useEffect } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PodMessagesDocument } from '@/graphql/chat';
import { useChatStore } from '@/stores/chat.store';

export type ChatMessage = ResultOf<typeof PodMessagesDocument>['podMessages'][number];

/** The user's chat rooms (thread list). */
export function useChatRooms() {
  const data = useChatStore((s) => s.data);
  const isLoading = useChatStore((s) => s.isLoading);
  const fetch = useChatStore((s) => s.fetch);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    rooms: data?.myChatRooms ?? [],
    isLoading,
    hasData: !!data,
    refetch: () => fetch(true),
  };
}
