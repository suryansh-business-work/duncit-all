import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  CHAT_PREVIEW_PAGE,
  hasEarlierMessages,
  mergeEarlierMessages,
  type ChatPreviewKind,
} from '@duncit/utils';
import { CHAT_PREVIEW, type ChatPreviewData } from './queries';

/**
 * The chat card's data: the newest page of the room's history, older pages on
 * request (put in front of what is shown, each line once), the total and the
 * viewer's membership.
 */
export function useChatPreview(kind: ChatPreviewKind, id: string) {
  const room = kind === 'POD' ? { pod_id: id } : { club_id: id };
  const { data, error, refetch, fetchMore } = useQuery<ChatPreviewData>(CHAT_PREVIEW, {
    variables: { ...room, limit: CHAT_PREVIEW_PAGE },
    fetchPolicy: 'cache-and-network',
  });
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [earlierFailed, setEarlierFailed] = useState(false);

  const preview = data?.chatPreview ?? null;
  const messages = preview?.messages ?? [];
  const total = preview?.total_count ?? 0;

  const loadEarlier = async () => {
    setLoadingEarlier(true);
    setEarlierFailed(false);
    try {
      await fetchMore({
        variables: { ...room, limit: CHAT_PREVIEW_PAGE, before: messages[0].createdAt },
        updateQuery: (shown, { fetchMoreResult }) => ({
          chatPreview: {
            ...fetchMoreResult.chatPreview,
            messages: mergeEarlierMessages(fetchMoreResult.chatPreview.messages, shown.chatPreview.messages),
          },
        }),
      });
    } catch {
      // The card says so beside the button; nothing already shown is lost.
      setEarlierFailed(true);
    } finally {
      setLoadingEarlier(false);
    }
  };

  return {
    preview,
    messages,
    total,
    loading: !data && !error,
    error,
    // Returned, not awaited: the button that calls it settles on either outcome,
    // and a failed re-read shows as the card's own error state.
    retry: () => refetch(),
    canLoadEarlier: hasEarlierMessages(messages.length, total),
    loadEarlier,
    loadingEarlier,
    earlierFailed,
  };
}
