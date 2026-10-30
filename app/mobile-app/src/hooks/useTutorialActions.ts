import { useCallback, useRef, useState } from 'react';
import { Share } from 'react-native';
import { tutorialShareUrl } from '@duncit/utils';

import { config } from '@/constants/config';
import { MobileMarkTutorialWatchedDocument, MobileToggleTutorialLikeDocument } from '@/graphql/tutorials';
import { graphqlRequest } from '@/services/graphql.client';
import { useTranslation } from '@/hooks/useTranslation';
import type { TutorialItem } from '@/hooks/useTutorialFeed';

/**
 * Like, share and "watched" for the Tutorials feed. The like is optimistic and
 * reverts with a message when the server refuses it; watched is sent at most
 * once per tutorial per visit (the server is idempotent anyway).
 */
export function useTutorialActions(patch: (id: string, next: Partial<TutorialItem>) => void) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);
  const sentWatched = useRef(new Set<string>());

  const toggleLike = useCallback(
    async (item: TutorialItem) => {
      const liked = !item.liked_by_me;
      patch(item.id, { liked_by_me: liked, like_count: Math.max(0, item.like_count + (liked ? 1 : -1)) });
      try {
        const data = await graphqlRequest(MobileToggleTutorialLikeDocument, { tutorial_id: item.id }, { auth: true });
        const result = data.toggleTutorialLike;
        patch(item.id, { liked_by_me: result.liked, like_count: result.like_count });
      } catch {
        patch(item.id, { liked_by_me: item.liked_by_me, like_count: item.like_count });
        setNotice(t('mweb.tutorials.likeFailed'));
      }
    },
    [patch, t],
  );

  const markWatched = useCallback(
    (item: TutorialItem) => {
      if (item.watched_by_me || sentWatched.current.has(item.id)) return;
      sentWatched.current.add(item.id);
      patch(item.id, { watched_by_me: true });
      graphqlRequest(MobileMarkTutorialWatchedDocument, { tutorial_id: item.id }, { auth: true }).catch(() => {
        // Not recorded: let the next play-through try again.
        sentWatched.current.delete(item.id);
        patch(item.id, { watched_by_me: false });
      });
    },
    [patch],
  );

  const share = useCallback(
    async (item: TutorialItem) => {
      const url = tutorialShareUrl(config.webUrl, item.id);
      try {
        await Share.share({ message: `${t('mweb.tutorials.shareText', { vars: { title: item.title } })}\n${url}` });
      } catch {
        setNotice(t('mweb.tutorials.shareFailed'));
      }
    },
    [t],
  );

  return { toggleLike, markWatched, share, notice, clearNotice: () => setNotice(null) };
}
