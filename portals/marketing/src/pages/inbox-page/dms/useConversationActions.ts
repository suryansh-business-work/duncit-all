import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import {
  ASSIGN_SOCIAL_CONVERSATION,
  CREATE_LEAD_FROM_SOCIAL_CONVERSATION,
  SEND_SOCIAL_MESSAGE,
  SET_SOCIAL_CONVERSATION_STATUS,
  SUGGEST_SOCIAL_MESSAGE,
  type SocialConversationThread,
} from '../dm.queries';
import { askForDraft, runInboxAction } from '../drawer/inboxActions';
import type { SocialInboxStatus } from '../queries';

interface LeadResult {
  lead_id: string;
  merged: boolean;
  thread: SocialConversationThread;
}

/**
 * What a person does to one conversation from its drawer — the same shape as
 * the comment actions (drawer/inboxActions): each says how it went, hands the
 * thread as the server now has it to `onChanged`, and resolves true when it
 * worked. The server checks the messaging window and permissions.
 */
export function useConversationActions(conversationId: string, onChanged: (thread: SocialConversationThread) => void) {
  const { t } = useTranslation();
  const [assignMut, assignState] = useMutation<{ assignSocialConversation: SocialConversationThread }>(ASSIGN_SOCIAL_CONVERSATION);
  const [statusMut, statusState] = useMutation<{ setSocialConversationStatus: SocialConversationThread }>(SET_SOCIAL_CONVERSATION_STATUS);
  const [sendMut, sendState] = useMutation<{ sendSocialMessage: SocialConversationThread }>(SEND_SOCIAL_MESSAGE);
  const [suggestMut, suggestState] = useMutation<{ suggestSocialMessage: { text: string; run_id: string } }>(SUGGEST_SOCIAL_MESSAGE);
  const [leadMut, leadState] = useMutation<{ createLeadFromSocialConversation: LeadResult }>(CREATE_LEAD_FROM_SOCIAL_CONVERSATION);
  const variables = { id: conversationId };

  return {
    busy: assignState.loading || statusState.loading || sendState.loading || leadState.loading,
    suggesting: suggestState.loading,
    assign: (userId: string | null) =>
      runInboxAction(
        async () => (await assignMut({ variables: { ...variables, user_id: userId } })).data?.assignSocialConversation,
        t('marketing.inbox.assigned'),
        onChanged
      ),
    setStatus: (status: SocialInboxStatus) =>
      runInboxAction(
        async () => (await statusMut({ variables: { ...variables, status } })).data?.setSocialConversationStatus,
        t('marketing.inbox.statusSaved'),
        onChanged
      ),
    send: (text: string) =>
      runInboxAction(async () => (await sendMut({ variables: { ...variables, text } })).data?.sendSocialMessage, t('marketing.inbox.dmSent'), onChanged),
    /** A matched lead is said differently from a new one; either way the conversation now points at it. */
    createLead: () =>
      runInboxAction(
        async () => (await leadMut({ variables })).data?.createLeadFromSocialConversation,
        (result) => (result.merged ? t('marketing.inbox.leadMatched') : t('marketing.inbox.leadCreated')),
        (result) => onChanged(result.thread)
      ),
    suggest: () => askForDraft(async () => (await suggestMut({ variables })).data?.suggestSocialMessage.text, t('marketing.inbox.suggested')),
  };
}
