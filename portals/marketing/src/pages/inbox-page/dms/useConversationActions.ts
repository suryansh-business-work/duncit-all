import { useMutation } from '@apollo/client/react';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  ASSIGN_SOCIAL_CONVERSATION,
  CREATE_LEAD_FROM_SOCIAL_CONVERSATION,
  SEND_SOCIAL_MESSAGE,
  SET_SOCIAL_CONVERSATION_STATUS,
  SUGGEST_SOCIAL_MESSAGE,
  type SocialConversationThread,
} from '../dm.queries';
import type { SocialInboxStatus } from '../queries';

interface LeadResult {
  lead_id: string;
  merged: boolean;
  thread: SocialConversationThread;
}

/**
 * What a person does to one conversation from its drawer — the same shape as
 * the comment actions: each says how it went, hands the thread as the server
 * now has it to `onChanged`, and resolves true when it worked. The server
 * checks the messaging window and permissions; a refusal is shown as it said.
 */
export function useConversationActions(conversationId: string, onChanged: (thread: SocialConversationThread) => void) {
  const { t } = useTranslation();
  const [assignMut, assignState] = useMutation<{ assignSocialConversation: SocialConversationThread }>(ASSIGN_SOCIAL_CONVERSATION);
  const [statusMut, statusState] = useMutation<{ setSocialConversationStatus: SocialConversationThread }>(SET_SOCIAL_CONVERSATION_STATUS);
  const [sendMut, sendState] = useMutation<{ sendSocialMessage: SocialConversationThread }>(SEND_SOCIAL_MESSAGE);
  const [suggestMut, suggestState] = useMutation<{ suggestSocialMessage: { text: string; run_id: string } }>(SUGGEST_SOCIAL_MESSAGE);
  const [leadMut, leadState] = useMutation<{ createLeadFromSocialConversation: LeadResult }>(CREATE_LEAD_FROM_SOCIAL_CONVERSATION);

  const run = async (work: () => Promise<SocialConversationThread | undefined>, done: string): Promise<boolean> => {
    try {
      const thread = await work();
      if (!thread) return false;
      notify(done, 'success');
      onChanged(thread);
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  return {
    busy: assignState.loading || statusState.loading || sendState.loading || leadState.loading,
    suggesting: suggestState.loading,
    assign: (userId: string | null) =>
      run(async () => (await assignMut({ variables: { id: conversationId, user_id: userId } })).data?.assignSocialConversation, t('marketing.inbox.assigned')),
    setStatus: (status: SocialInboxStatus) =>
      run(async () => (await statusMut({ variables: { id: conversationId, status } })).data?.setSocialConversationStatus, t('marketing.inbox.statusSaved')),
    send: (text: string) =>
      run(async () => (await sendMut({ variables: { id: conversationId, text } })).data?.sendSocialMessage, t('marketing.inbox.dmSent')),
    createLead: async (): Promise<boolean> => {
      try {
        const result = (await leadMut({ variables: { id: conversationId } })).data?.createLeadFromSocialConversation;
        if (!result) return false;
        notify(result.merged ? t('marketing.inbox.leadMatched') : t('marketing.inbox.leadCreated'), 'success');
        onChanged(result.thread);
        return true;
      } catch (err) {
        notify(parseApiError(err), 'error');
        return false;
      }
    },
    suggest: async (): Promise<string | null> => {
      try {
        const draft = (await suggestMut({ variables: { id: conversationId } })).data?.suggestSocialMessage.text ?? null;
        if (draft) notify(t('marketing.inbox.suggested'), 'success');
        return draft;
      } catch (err) {
        notify(parseApiError(err), 'error');
        return null;
      }
    },
  };
}
