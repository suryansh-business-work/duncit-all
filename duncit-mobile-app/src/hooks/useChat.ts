import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PodMessagesDocument } from '@/graphql/chat';
import { graphqlRequest } from '@/services/graphql.client';
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

/** Recent messages for a single room (read-only view). */
export function usePodMessages(podId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(PodMessagesDocument, { podId, limit: 50 }, { auth: true })
      .then((data) => active && setMessages(data.podMessages))
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId]);

  return { messages, isLoading, error };
}
