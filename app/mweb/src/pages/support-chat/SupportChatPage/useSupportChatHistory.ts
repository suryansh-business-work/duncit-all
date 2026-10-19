import { useState, type Dispatch, type SetStateAction } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { CHAT_HISTORY_PAGE, hasOlderPage, mergeEarlierMessages, olderPageCursor } from '@duncit/utils';
import { SUPPORT_CHAT_MESSAGES, type SupportChatMessage } from '../queries';

interface SupportChatHistoryOptions {
  sessionId: string | null;
  /** How many lines the thread's newest page came back with. */
  firstPageLength: number;
  messages: readonly SupportChatMessage[];
  setMessages: Dispatch<SetStateAction<SupportChatMessage[]>>;
}

/**
 * Older pages of the support thread, put in front of the lines shown. The
 * thread lives in local state (socket lines and optimistic sends join it there),
 * so a page is read straight from the network and merged into that state rather
 * than into the cached newest page, which would overwrite them.
 */
export function useSupportChatHistory({ sessionId, firstPageLength, messages, setMessages }: SupportChatHistoryOptions) {
  const client = useApolloClient();
  // The session whose first line has been reached: no page before it to ask for.
  const [startOf, setStartOf] = useState<string | null>(null);

  const loadOlder = async () => {
    const before = olderPageCursor(messages, (m) => m.created_at);
    if (!sessionId || !before) return;
    const { data } = await client.query<{ supportChatMessages: SupportChatMessage[] }>({
      query: SUPPORT_CHAT_MESSAGES,
      variables: { session_id: sessionId, limit: CHAT_HISTORY_PAGE, before },
      fetchPolicy: 'no-cache',
    });
    const page = data?.supportChatMessages ?? [];
    setMessages((shown) => mergeEarlierMessages(page, shown));
    if (!hasOlderPage(page.length)) setStartOf(sessionId);
  };

  return {
    canLoadOlder: !!sessionId && startOf !== sessionId && hasOlderPage(firstPageLength),
    loadOlder,
  };
}
