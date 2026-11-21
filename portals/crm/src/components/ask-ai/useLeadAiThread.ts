import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import type { CrmLeadAiActionStatus } from '@duncit/gql-types';
import type { CrmLeadEntityType } from '../../api/crm.types';
import {
  ASK_CRM_LEAD_AI,
  CLEAR_CRM_LEAD_AI_THREAD,
  CRM_LEAD_AI_THREAD,
  SET_CRM_LEAD_AI_ACTION_STATUS,
  type AskAiContext,
  type AskAiMessage,
  type AskCrmLeadAiData,
  type CrmLeadAiThreadData,
  type SetCrmLeadAiActionStatusData,
} from '../../api/askAi.gql';

/**
 * The agent's Ask AI thread for one lead. The server owns the history; this
 * keeps a local copy so a question shows the moment it is sent, and swaps in
 * the saved pair once the answer arrives.
 */
export function useLeadAiThread(entity: CrmLeadEntityType, leadId: string, open: boolean) {
  const variables = { entity, lead_id: leadId };
  const { data, loading: loadingThread, error: threadError, refetch } = useQuery<CrmLeadAiThreadData>(CRM_LEAD_AI_THREAD, {
    variables,
    skip: !open,
    fetchPolicy: 'network-only',
  });
  const [askMut, { loading: asking }] = useMutation<AskCrmLeadAiData>(ASK_CRM_LEAD_AI);
  const [clearMut, { loading: clearing }] = useMutation<{ clearCrmLeadAiThread: boolean }>(CLEAR_CRM_LEAD_AI_THREAD);
  const [statusMut] = useMutation<SetCrmLeadAiActionStatusData>(SET_CRM_LEAD_AI_ACTION_STATUS);

  const [messages, setMessages] = useState<AskAiMessage[]>([]);
  const [context, setContext] = useState<AskAiContext | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setMessages(data.crmLeadAiThread.messages);
    setContext(data.crmLeadAiThread.context);
  }, [data]);

  /** Resolves true when the answer arrived, false when the question should go back in the box. */
  const ask = async (text: string): Promise<boolean> => {
    const message = text.trim();
    if (!message || asking) return false;
    setError(null);
    setPending(message);
    try {
      const res = await askMut({ variables: { ...variables, message } });
      const reply = res.data?.askCrmLeadAi;
      if (reply) {
        setMessages((prev) => [...prev, reply.user_message, reply.assistant_message]);
        setContext(reply.context);
      }
      return true;
    } catch (e) {
      setError(parseApiError(e));
      return false;
    } finally {
      setPending(null);
    }
  };

  const clear = async () => {
    setError(null);
    try {
      await clearMut({ variables });
      setMessages([]);
      await refetch();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const setActionStatus = async (messageId: string, index: number, status: CrmLeadAiActionStatus, resultMessage?: string) => {
    try {
      const res = await statusMut({
        variables: { ...variables, message_id: messageId, action_index: index, status, result_message: resultMessage ?? null },
      });
      const updated = res.data?.setCrmLeadAiActionStatus;
      if (updated) setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return {
    messages,
    context,
    pending,
    asking,
    clearing,
    loadingThread: loadingThread && !data,
    error: error ?? (threadError ? parseApiError(threadError) : null),
    ask,
    clear,
    setActionStatus,
    /** Re-read the context after the agent changed the lead (a reminder saved, an email sent). */
    refresh: () => refetch().catch((e: unknown) => setError(parseApiError(e))),
  };
}
