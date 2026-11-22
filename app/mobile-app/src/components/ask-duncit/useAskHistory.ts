import { useCallback, useEffect, useState } from 'react';
import { logs } from '@duncit/logs';

import {
  AskDuncitConversationsDocument,
  AskDuncitMemoryDocument,
  DeleteAskDuncitConversationDocument,
  ForgetAskDuncitFactDocument,
} from '@/graphql/askDuncit';
import type { MobileAskDuncitConversationsQuery } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';

export type AskConversationItem =
  MobileAskDuncitConversationsQuery['askDuncitConversations']['items'][number];

/** Chat history and remembered facts for the native history sheet — the data half of mWeb's HistoryDrawer. */
export function useAskHistory(open: boolean, showMemory: boolean, search: string) {
  const [items, setItems] = useState<AskConversationItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [facts, setFacts] = useState<{ id: string; text: string }[]>([]);

  const load = useCallback(
    async (before?: string) => {
      setLoading(true);
      setFailed(false);
      try {
        const data = await graphqlRequest(
          AskDuncitConversationsDocument,
          { before, search: search.trim() || null },
          { auth: true },
        );
        const page = data.askDuncitConversations;
        setItems((prev) => (before ? [...prev, ...page.items] : page.items));
        setHasMore(page.has_more);
      } catch (error) {
        logs.mobileApp.warn('ask-duncit', 'history', { error });
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  const loadFacts = useCallback(async () => {
    try {
      const data = await graphqlRequest(AskDuncitMemoryDocument, {}, { auth: true });
      setFacts(data.askDuncitMemory);
    } catch (error) {
      logs.mobileApp.warn('ask-duncit', 'memory', { error });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    load().catch(() => undefined);
    if (showMemory) loadFacts().catch(() => undefined);
  }, [open, showMemory, load, loadFacts]);

  const loadMore = useCallback(() => {
    const last = items[items.length - 1];
    if (last?.last_message_at) load(last.last_message_at).catch(() => undefined);
  }, [items, load]);

  const remove = useCallback(async (id: string) => {
    await graphqlRequest(DeleteAskDuncitConversationDocument, { id }, { auth: true });
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const forget = useCallback(async (id: string) => {
    await graphqlRequest(ForgetAskDuncitFactDocument, { id }, { auth: true });
    setFacts((prev) => prev.filter((fact) => fact.id !== id));
  }, []);

  return { items, hasMore, loading, failed, facts, loadMore, remove, forget };
}
