import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { mergeVenueChatLines, VENUE_CHAT_PAGE, type VenueChatLine } from '@duncit/utils';
import { SEND_VENUE_CHAT_MESSAGE, VENUE_CHAT_MESSAGES, VENUE_CHAT_POLL_MS } from './queries';

const LOGGER = logs.portal['partners-app'];

/**
 * One pod's venue ↔ host thread: the latest page, re-read every
 * VENUE_CHAT_POLL_MS while the thread is open, plus whatever was sent from
 * here. Lines accumulate by id (mergeVenueChatLines), so a poll never drops a
 * line already on screen and a sent line never shows twice.
 */
export function useVenueChatThread(podId: string) {
  const [lines, setLines] = useState<VenueChatLine[]>([]);
  const latest = useQuery(VENUE_CHAT_MESSAGES, {
    variables: { pod_id: podId, limit: VENUE_CHAT_PAGE },
    pollInterval: VENUE_CHAT_POLL_MS,
    fetchPolicy: 'network-only',
  });
  const [send, sendState] = useMutation(SEND_VENUE_CHAT_MESSAGE);

  useEffect(() => {
    const page = latest.data?.venueChatMessages;
    if (page) setLines((current) => mergeVenueChatLines(current, page));
  }, [latest.data]);

  useEffect(() => {
    if (latest.error) LOGGER.warn('VenueChatPage', 'useVenueChatThread.load', { error: latest.error });
  }, [latest.error]);

  /** Sends one text line; resolves false (and logs) when the server refused it. */
  const sendText = async (text: string): Promise<boolean> => {
    try {
      const result = await send({ variables: { pod_id: podId, type: 'TEXT', text } });
      const line = result.data?.sendVenueChatMessage;
      if (line) setLines((current) => mergeVenueChatLines(current, [line]));
      return true;
    } catch (error: unknown) {
      LOGGER.error('VenueChatPage', 'useVenueChatThread.send', { error });
      return false;
    }
  };

  return {
    lines,
    /** Only the first read shows a spinner; later polls refresh in place. */
    loading: latest.loading && !latest.data,
    error: latest.error,
    retry: latest.refetch,
    sending: sendState.loading,
    sendText,
  };
}
