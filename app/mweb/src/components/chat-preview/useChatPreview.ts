import { useQuery } from '@apollo/client/react';
import {
  CHAT_PREVIEW_PAGE,
  hasEarlierMessages,
  mergeEarlierMessages,
  olderPageCursor,
  type ChatPreviewKind,
} from '@duncit/utils';
import { CHAT_PREVIEW, type ChatPreviewData } from './queries';

/**
 * The chat card's data: the newest page of the room's history, older pages on
 * request (put in front of what is shown, each line once), the total and the
 * viewer's membership. Loading and failure of an older page are the card's
 * scroll-up history's to show (useScrollUpHistory).
 */
export function useChatPreview(kind: ChatPreviewKind, id: string) {
  const room = kind === 'POD' ? { pod_id: id } : { club_id: id };
  const { data, error, refetch, fetchMore } = useQuery<ChatPreviewData>(CHAT_PREVIEW, {
    variables: { ...room, limit: CHAT_PREVIEW_PAGE },
    fetchPolicy: 'cache-and-network',
  });

  const preview = data?.chatPreview ?? null;
  const messages = preview?.messages ?? [];
  const total = preview?.total_count ?? 0;

  /** Rejects when the page failed, so the card can say so; nothing shown is lost. */
  const loadEarlier = async () => {
    const before = olderPageCursor(messages, (m) => m.createdAt);
    if (!before) return;
    await fetchMore({
      variables: { ...room, limit: CHAT_PREVIEW_PAGE, before },
      updateQuery: (shown, { fetchMoreResult }) => ({
        chatPreview: {
          ...fetchMoreResult.chatPreview,
          messages: mergeEarlierMessages(fetchMoreResult.chatPreview.messages, shown.chatPreview.messages),
        },
      }),
    });
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
  };
}
