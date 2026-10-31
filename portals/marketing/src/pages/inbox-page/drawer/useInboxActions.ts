import { useMutation } from '@apollo/client/react';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  ASSIGN_SOCIAL_COMMENT,
  REPLY_TO_SOCIAL_COMMENT,
  SET_SOCIAL_COMMENT_STATUS,
  SUGGEST_SOCIAL_REPLY,
  type InboxComment,
  type SocialInboxStatus,
} from '../queries';

/**
 * What a person does to one comment from the drawer. Each action says how it
 * went and hands the comment as the server now has it to `onChanged`; it
 * resolves true when it worked, so a dialog or the reply box knows to close
 * or clear. A suggestion resolves to the draft, or null.
 */
export function useInboxActions(commentId: string, onChanged: (comment: InboxComment) => void) {
  const { t } = useTranslation();
  const [assignMut, assignState] = useMutation<{ assignSocialComment: InboxComment }>(ASSIGN_SOCIAL_COMMENT);
  const [statusMut, statusState] = useMutation<{ setSocialCommentStatus: InboxComment }>(SET_SOCIAL_COMMENT_STATUS);
  const [replyMut, replyState] = useMutation<{ replyToSocialComment: InboxComment }>(REPLY_TO_SOCIAL_COMMENT);
  const [suggestMut, suggestState] = useMutation<{ suggestSocialReply: { text: string; run_id: string } }>(SUGGEST_SOCIAL_REPLY);

  const run = async (work: () => Promise<InboxComment | undefined>, done: string): Promise<boolean> => {
    try {
      const comment = await work();
      if (!comment) return false;
      notify(done, 'success');
      onChanged(comment);
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  return {
    busy: assignState.loading || statusState.loading || replyState.loading,
    suggesting: suggestState.loading,
    assign: (userId: string | null) =>
      run(async () => (await assignMut({ variables: { id: commentId, user_id: userId } })).data?.assignSocialComment, t('marketing.inbox.assigned')),
    setStatus: (status: SocialInboxStatus) =>
      run(async () => (await statusMut({ variables: { id: commentId, status } })).data?.setSocialCommentStatus, t('marketing.inbox.statusSaved')),
    reply: (text: string) =>
      run(async () => (await replyMut({ variables: { id: commentId, text } })).data?.replyToSocialComment, t('marketing.inbox.sent')),
    suggest: async (): Promise<string | null> => {
      try {
        const draft = (await suggestMut({ variables: { id: commentId } })).data?.suggestSocialReply.text ?? null;
        if (draft) notify(t('marketing.inbox.suggested'), 'success');
        return draft;
      } catch (err) {
        notify(parseApiError(err), 'error');
        return null;
      }
    },
  };
}
