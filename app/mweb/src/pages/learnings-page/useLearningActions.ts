import { useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { tutorialShareUrl } from '@duncit/utils';
import { notifyError, notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import {
  MARK_LEARNING_WATCHED,
  TOGGLE_LEARNING_LIKE,
  type LearningCard,
  type MarkWatchedData,
  type ToggleLikeData,
} from './queries';

type Patch = (id: string, change: Partial<LearningCard>) => void;

/** Like, share and "watched" for a Learnings card. Native twin: useTutorialActions. */
export function useLearningActions(patch: Patch) {
  const { t } = useTranslation();
  const [toggleLike] = useMutation<ToggleLikeData>(TOGGLE_LEARNING_LIKE);
  const [markWatched] = useMutation<MarkWatchedData>(MARK_LEARNING_WATCHED);
  // One watched call per video per visit — the server is idempotent anyway.
  const sentWatched = useRef(new Set<string>());

  const like = useCallback(
    async (card: LearningCard) => {
      const liked = !card.liked_by_me;
      patch(card.id, { liked_by_me: liked, like_count: Math.max(0, card.like_count + (liked ? 1 : -1)) });
      try {
        const { data } = await toggleLike({ variables: { tutorial_id: card.id } });
        const result = data?.toggleTutorialLike;
        if (result) patch(card.id, { liked_by_me: result.liked, like_count: result.like_count });
      } catch (error) {
        logs.mWeb.warn('LearningsPage', 'toggleLike', { error });
        patch(card.id, { liked_by_me: card.liked_by_me, like_count: card.like_count });
        notifyError(t('mweb.tutorials.likeFailed'));
      }
    },
    [patch, t, toggleLike],
  );

  const watched = useCallback(
    (card: LearningCard) => {
      if (card.watched_by_me || sentWatched.current.has(card.id)) return;
      sentWatched.current.add(card.id);
      patch(card.id, { watched_by_me: true });
      markWatched({ variables: { tutorial_id: card.id } }).catch((error: unknown) => {
        // The badge stays: a retry on the next visit records it server-side.
        sentWatched.current.delete(card.id);
        logs.mWeb.warn('LearningsPage', 'markWatched', { error });
      });
    },
    [markWatched, patch],
  );

  const share = useCallback(
    async (card: LearningCard) => {
      const url = tutorialShareUrl(globalThis.location.origin, card.id);
      const text = t('mweb.tutorials.shareText', { vars: { title: card.title } });
      try {
        if (navigator.share) {
          await navigator.share({ title: card.title, text, url });
          return;
        }
        await navigator.clipboard.writeText(`${text} ${url}`);
        notifySuccess(t('mweb.tutorials.shareCopied'));
      } catch (error) {
        // Closing the share sheet rejects with AbortError — not a failure.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        logs.mWeb.warn('LearningsPage', 'share', { error });
        notifyError(t('mweb.tutorials.shareFailed'));
      }
    },
    [t],
  );

  return { like, watched, share };
}
