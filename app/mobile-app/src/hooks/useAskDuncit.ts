import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  acceptTurn,
  addOptimisticQuestion,
  applyActionEvent,
  errorKey,
  pageContextFromPath,
  rejectTurn,
  tempMessageId,
  type AskDuncitActionView,
  type AskDuncitAttachmentView,
} from '@duncit/utils';
import { parseIssue } from '@duncit/errors';
import { logs } from '@duncit/logs';

import {
  AskDuncitBootstrapDocument,
  DecideAskDuncitActionDocument,
  HandoverAskDuncitDocument,
  RateAskDuncitDocument,
  RollbackAskDuncitActionDocument,
  SendAskDuncitDocument,
  StopAskDuncitDocument,
} from '@/graphql/askDuncit';
import { AskDuncitSurface, type MobileAskDuncitBootstrapQuery } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { useLocaleStore } from '@/stores/locale.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { useAskDuncitThread } from './useAskDuncitThread';

export type AskDuncitBootstrap = MobileAskDuncitBootstrapQuery['askDuncitBootstrap'];

interface Options {
  conversationId: string | null;
  /** The app path the screen was opened about (deep link `?from=`), for contextual answers. */
  from: string | null;
  onConversationCreated: (id: string) => void;
}

/**
 * Everything the native Ask Duncit screen does — the twin of mWeb's
 * useAskDuncit, over graphqlRequest instead of Apollo. A failure becomes a
 * localization KEY (`errorKey`) the screen shows in its banner.
 */
export function useAskDuncit({ conversationId, from, onConversationCreated }: Options) {
  const mode = useStudioModeStore((s) => s.mode);
  const locale = useLocaleStore((s) => s.locale);
  const page = useMemo(() => pageContextFromPath(from), [from]);
  const [bootstrap, setBootstrap] = useState<AskDuncitBootstrap | null>(null);
  const [bootstrapError, setBootstrapError] = useState(false);
  const [sending, setSending] = useState(false);
  const [handingOver, setHandingOver] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const { thread, setThread, loading, loadError, loadOlder } = useAskDuncitThread(conversationId);

  const report = useCallback((where: string, error: unknown) => {
    logs.mobileApp.warn('ask-duncit', where, { error });
    setErrorText(errorKey(parseIssue(error).code));
  }, []);

  const loadBootstrap = useCallback(async () => {
    setBootstrapError(false);
    try {
      const data = await graphqlRequest(
        AskDuncitBootstrapDocument,
        { role: mode, page },
        { auth: true },
      );
      setBootstrap(data.askDuncitBootstrap);
    } catch (error) {
      logs.mobileApp.warn('ask-duncit', 'bootstrap', { error });
      setBootstrapError(true);
    }
  }, [mode, page]);

  useEffect(() => {
    loadBootstrap().catch(() => undefined);
  }, [loadBootstrap]);

  const send = useCallback(
    async (text: string, attachments: AskDuncitAttachmentView[] = []) => {
      const temp = tempMessageId();
      setErrorText(null);
      setThread((prev) => addOptimisticQuestion(prev, temp, text, attachments));
      setSending(true);
      try {
        const data = await graphqlRequest(
          SendAskDuncitDocument,
          {
            input: {
              message: text,
              conversation_id: thread.conversationId,
              role: mode,
              surface: AskDuncitSurface.Native,
              locale,
              page,
              attachments: attachments.map(({ url, kind, name, mime, size }) => ({
                url,
                kind,
                name,
                mime,
                size,
              })),
            },
          },
          { auth: true },
        );
        const result = data.sendAskDuncitMessage;
        setThread((prev) => acceptTurn(prev, temp, result));
        if (!thread.conversationId) onConversationCreated(result.conversation_id);
      } catch (error) {
        setThread((prev) => rejectTurn(prev, temp));
        report('send', error);
      } finally {
        setSending(false);
      }
    },
    [setThread, thread.conversationId, mode, locale, page, onConversationCreated, report],
  );

  const stop = useCallback(() => {
    if (!thread.streamingId) return;
    graphqlRequest(StopAskDuncitDocument, { messageId: thread.streamingId }, { auth: true }).catch(
      (e: unknown) => report('stop', e),
    );
  }, [thread.streamingId, report]);

  const applyAction = useCallback(
    (action: unknown) => setThread((prev) => applyActionEvent(prev, action as AskDuncitActionView)),
    [setThread],
  );

  const decide = useCallback(
    async (id: string, approve: boolean) => {
      try {
        const data = await graphqlRequest(
          DecideAskDuncitActionDocument,
          { id, approve },
          { auth: true },
        );
        applyAction(data.decideAskDuncitAction);
      } catch (error) {
        report('decide', error);
      }
    },
    [applyAction, report],
  );

  const rollback = useCallback(
    async (id: string) => {
      try {
        const data = await graphqlRequest(RollbackAskDuncitActionDocument, { id }, { auth: true });
        applyAction(data.rollbackAskDuncitAction);
      } catch (error) {
        report('rollback', error);
      }
    },
    [applyAction, report],
  );

  const rate = useCallback(
    async (messageId: string, rating: 'UP' | 'DOWN') => {
      setThread((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === messageId ? { ...m, feedback_rating: rating } : m,
        ),
      }));
      try {
        await graphqlRequest(RateAskDuncitDocument, { messageId, rating }, { auth: true });
      } catch (error) {
        report('rate', error);
      }
    },
    [setThread, report],
  );

  /** Resolves the ticket number on success, null on failure. */
  const handover = useCallback(
    async (team: string, summary: string): Promise<string | null> => {
      if (!thread.conversationId) return null;
      setHandingOver(true);
      try {
        const data = await graphqlRequest(
          HandoverAskDuncitDocument,
          { conversationId: thread.conversationId, team, summary, role: mode },
          { auth: true },
        );
        return (
          data.handOverAskDuncitConversation.ticket_no ||
          data.handOverAskDuncitConversation.ticket_id
        );
      } catch (error) {
        report('handover', error);
        return null;
      } finally {
        setHandingOver(false);
      }
    },
    [thread.conversationId, mode, report],
  );

  return {
    bootstrap,
    bootstrapError,
    retryBootstrap: loadBootstrap,
    thread,
    loading,
    loadError,
    sending,
    handingOver,
    errorText,
    clearError: () => setErrorText(null),
    loadOlder,
    send,
    stop,
    decide,
    rollback,
    rate,
    handover,
  };
}

export type AskDuncitNativeController = ReturnType<typeof useAskDuncit>;
