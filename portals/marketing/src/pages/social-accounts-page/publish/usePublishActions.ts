import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  DELETE_SCHEDULED_SOCIAL_POST,
  PUBLISH_LISTS,
  RETRY_SCHEDULED_SOCIAL_POST,
  SHARE_SCHEDULED_SOCIAL_POST_NOW,
  type SocialScheduledPost,
} from '../publish.queries';

/** Delete, share now and retry — each confirms or reports its own outcome and refreshes the lists. */
export function usePublishActions() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [removeMut] = useMutation(DELETE_SCHEDULED_SOCIAL_POST, { refetchQueries: PUBLISH_LISTS });
  const [retryMut] = useMutation(RETRY_SCHEDULED_SOCIAL_POST, { refetchQueries: PUBLISH_LISTS });
  const [shareMut] = useMutation(SHARE_SCHEDULED_SOCIAL_POST_NOW, { refetchQueries: PUBLISH_LISTS });

  const run = useCallback(
    async (action: () => Promise<unknown>, doneKey: string): Promise<boolean> => {
      try {
        await action();
      } catch (error) {
        notify(parseApiError(error), 'error');
        return false;
      }
      notify(t(doneKey), 'success');
      return true;
    },
    [t]
  );

  const remove = useCallback(
    async (post: SocialScheduledPost): Promise<boolean> => {
      const ok = await confirm({
        title: t('marketing.social.deletePostTitle'),
        message: t('marketing.social.deletePostMessage'),
        destructive: true,
      });
      if (!ok) return false;
      return run(() => removeMut({ variables: { id: post.id } }), 'marketing.social.postDeleted');
    },
    [confirm, removeMut, run, t]
  );

  const retry = useCallback(
    (post: SocialScheduledPost) => run(() => retryMut({ variables: { id: post.id } }), 'marketing.social.retrying'),
    [retryMut, run]
  );

  const shareNow = useCallback(
    (post: SocialScheduledPost) => run(() => shareMut({ variables: { id: post.id } }), 'marketing.social.publishingNow'),
    [shareMut, run]
  );

  return { remove, retry, shareNow };
}
