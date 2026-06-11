import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ChatRoomsDocument } from '@/graphql/chat';
import { graphqlRequest } from '@/services/graphql.client';

export type ChatRoomsData = ResultOf<typeof ChatRoomsDocument>;
export type ChatRoom = ChatRoomsData['myChatRooms'][number];

interface ChatState {
  data?: ChatRoomsData;
  isLoading: boolean;
  error?: unknown;
  fetch: (force?: boolean) => Promise<void>;
}

/** The signed-in user's chat rooms (the pods they're in). */
export const useChatStore = create<ChatState>((set, get) => ({
  isLoading: false,
  fetch: async (force = false) => {
    if (get().isLoading) return;
    if (get().data && !force) return;
    set({ isLoading: true, error: undefined });
    try {
      const data = await graphqlRequest(ChatRoomsDocument, undefined, { auth: true });
      set({ data, isLoading: false });
    } catch (error) {
      set({ error, isLoading: false });
    }
  },
}));
