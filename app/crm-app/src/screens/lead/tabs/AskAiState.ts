import { useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  CrmAppAskLeadAiDocument,
  CrmAppClearLeadAiDocument,
  CrmAppLeadAiThreadDocument,
  CrmAppSetLeadAiActionDocument,
} from '@/graphql/leadTabsB';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

type Thread = ResultOf<typeof CrmAppLeadAiThreadDocument>['crmLeadAiThread'];
export type AskAiMessage = Thread['messages'][number];
export type AskAiAction = AskAiMessage['actions'][number];
export type AskAiContext = Thread['context'];
export type AskAiActionStatus = 'PROPOSED' | 'DONE' | 'DISMISSED';

/**
 * The agent's Ask AI thread for one lead. The server owns the history; this
 * keeps a local copy so a question shows the moment it is sent, and swaps in
 * the saved pair once the answer arrives — the portal's useLeadAiThread.
 */
export function useAskAiThread(kind: LeadKind, id: string) {
  const { t } = useTranslation();
  const variables = useMemo(() => ({ entity: kind, lead_id: id }), [kind, id]);
  const query = useGqlQuery(CrmAppLeadAiThreadDocument, variables, {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const [messages, setMessages] = useState<AskAiMessage[]>([]);
  const [context, setContext] = useState<AskAiContext | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const failed = (err: unknown) => setError(errorMessage(err, t('crmApp.common.saveFailed')));

  useEffect(() => {
    if (!query.data) return;
    setMessages(query.data.crmLeadAiThread.messages);
    setContext(query.data.crmLeadAiThread.context);
  }, [query.data]);

  /** Resolves true when the answer arrived, false when the question should go back in the box. */
  const ask = async (text: string): Promise<boolean> => {
    const message = text.trim();
    if (!message || asking) return false;
    setError(null);
    setPending(message);
    setAsking(true);
    try {
      const { askCrmLeadAi: reply } = await gqlRequest(CrmAppAskLeadAiDocument, {
        ...variables,
        message,
      });
      setMessages((prev) => [...prev, reply.user_message, reply.assistant_message]);
      setContext(reply.context);
      return true;
    } catch (err) {
      failed(err);
      return false;
    } finally {
      setPending(null);
      setAsking(false);
    }
  };

  const clear = async () => {
    setError(null);
    setClearing(true);
    try {
      await gqlRequest(CrmAppClearLeadAiDocument, variables);
      setMessages([]);
      await query.refetch();
    } catch (err) {
      failed(err);
    } finally {
      setClearing(false);
    }
  };

  const setActionStatus = async (
    messageId: string,
    index: number,
    status: AskAiActionStatus,
    resultMessage?: string,
  ) => {
    try {
      const { setCrmLeadAiActionStatus: updated } = await gqlRequest(
        CrmAppSetLeadAiActionDocument,
        {
          ...variables,
          message_id: messageId,
          action_index: index,
          status,
          result_message: resultMessage ?? null,
        },
      );
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      failed(err);
    }
  };

  return {
    messages,
    context,
    pending,
    asking,
    clearing,
    loadingThread: query.loading && !query.data,
    error: error ?? (query.data ? null : query.error),
    clearError: () => setError(null),
    ask,
    clear,
    setActionStatus,
    /** Re-read the context after the agent changed the lead (a reminder saved, an email sent). */
    refresh: query.refetch,
  };
}
