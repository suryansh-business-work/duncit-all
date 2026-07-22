import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ChatParticipantsDocument, PodMessagesDocument } from '@/graphql/chat';
import { graphqlRequest } from '@/services/graphql.client';
import { useChatStore } from '@/stores/chat.store';

export type ChatMessage = ResultOf<typeof PodMessagesDocument>['podMessages'][number];
type ChatParticipantsData = ResultOf<typeof ChatParticipantsDocument>;
export type ChatPerson = ChatParticipantsData['chatParticipants']['hosts'][number];

/** The user's chat rooms (thread list). */
export function useChatRooms() {
  const data = useChatStore((s) => s.data);
  const isLoading = useChatStore((s) => s.isLoading);
  const fetch = useChatStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    rooms: data?.myChatRooms ?? [],
    isLoading,
    hasData: !!data,
    refetch: () => fetch(true),
  };
}

/** Host(s) + participants of a room, for the chat-detail people panel. */
export function useChatParticipants(podId: string) {
  const [data, setData] = useState<ChatParticipantsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(ChatParticipantsDocument, { podId }, { auth: true })
      .then((result) => active && setData(result))
      .catch(() => active && setData(null))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId]);

  const people = data?.chatParticipants;
  return {
    hosts: people?.hosts ?? [],
    participants: people?.participants ?? [],
    count: people?.participant_count ?? 0,
    isLoading,
  };
}
