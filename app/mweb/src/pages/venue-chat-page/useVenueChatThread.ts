import { useCallback, useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  VENUE_CHAT_PAGE,
  firstGraphQLError,
  hasOlderPage,
  isVenueChatUnavailable,
  mergeVenueChatLines,
  olderPageCursor,
  type VenueChatLine,
} from '@duncit/utils';
import { SEND_VENUE_CHAT_MESSAGE, VENUE_CHAT_MESSAGES, VENUE_CHAT_ROOM } from './queries';

/** What a send carries: a text line, or a photo already uploaded. */
export type VenueChatSend = { type: 'TEXT'; text: string } | { type: 'IMAGE'; image_url: string };

const lineTime = (line: VenueChatLine) => line.createdAt;

const errorCodeOf = (error: unknown): string | null => {
  const code = firstGraphQLError(error)?.extensions?.code;
  return typeof code === 'string' ? code : null;
};

/**
 * One venue thread for the page: who it is with, its lines (the newest page,
 * older pages read on scroll-up, sent lines and socket lines — each once, oldest
 * first) and the send. The page owns the socket and feeds it in via `addLines`.
 */
export function useVenueChatThread(podId: string | undefined) {
  const client = useApolloClient();
  const skip = !podId;
  const variables = { pod_id: podId ?? '' };
  const roomQuery = useQuery(VENUE_CHAT_ROOM, { variables, skip, fetchPolicy: 'cache-and-network' });
  const pageQuery = useQuery(VENUE_CHAT_MESSAGES, {
    variables: { ...variables, limit: VENUE_CHAT_PAGE },
    skip,
    fetchPolicy: 'network-only',
  });
  const [sendMutation] = useMutation(SEND_VENUE_CHAT_MESSAGE);
  const [added, setAdded] = useState<VenueChatLine[]>([]);
  // The first line of the thread has been reached: no older page to ask for.
  const [startReached, setStartReached] = useState(false);

  const firstPage = pageQuery.data?.venueChatMessages;
  const lines = useMemo(() => mergeVenueChatLines(firstPage ?? [], added), [firstPage, added]);
  const addLines = useCallback(
    (incoming: readonly VenueChatLine[]) => setAdded((shown) => mergeVenueChatLines(shown, incoming)),
    [],
  );

  const loadOlder = async () => {
    const before = olderPageCursor(lines, lineTime);
    if (!before) return;
    const { data } = await client.query({
      query: VENUE_CHAT_MESSAGES,
      variables: { ...variables, limit: VENUE_CHAT_PAGE, before },
      fetchPolicy: 'network-only',
    });
    const page = data?.venueChatMessages ?? [];
    addLines(page);
    if (!hasOlderPage(page.length, VENUE_CHAT_PAGE)) setStartReached(true);
  };

  const send = async (input: VenueChatSend) => {
    const { data } = await sendMutation({ variables: { ...variables, ...input } });
    if (data) addLines([data.sendVenueChatMessage]);
  };

  const retry = () => Promise.all([roomQuery.refetch(), pageQuery.refetch()]);

  const error = roomQuery.error ?? pageQuery.error;
  return {
    room: roomQuery.data?.venueChatRoom ?? null,
    lines,
    loading: (roomQuery.loading && !roomQuery.data) || (pageQuery.loading && !pageQuery.data),
    unavailable: isVenueChatUnavailable(errorCodeOf(error)),
    failed: !!error,
    retry,
    canLoadOlder: !startReached && hasOlderPage(firstPage?.length ?? 0, VENUE_CHAT_PAGE),
    loadOlder,
    send,
    addLines,
  };
}
