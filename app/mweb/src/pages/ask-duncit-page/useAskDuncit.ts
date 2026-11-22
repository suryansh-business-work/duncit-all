import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  acceptTurn,
  addOptimisticQuestion,
  applyActionEvent,
  pageContextFromPath,
  rejectTurn,
  tempMessageId,
  errorKey,
  type AskDuncitAttachmentView,
} from '@duncit/utils';
import { parseIssue } from '@duncit/errors';
import { logs } from '@duncit/logs';
import { useStudioMode } from '../../StudioModeContext';
import { notifyError, notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import {
  ASK_DUNCIT_BOOTSTRAP,
  DECIDE_ASK_DUNCIT_ACTION,
  HANDOVER_ASK_DUNCIT,
  RATE_ASK_DUNCIT,
  ROLLBACK_ASK_DUNCIT_ACTION,
  SEND_ASK_DUNCIT,
  STOP_ASK_DUNCIT,
  type Action,
  type Bootstrap,
  type SendResult,
} from './queries';
import { useAskDuncitThread } from './useAskDuncitThread';

/**
 * Everything the Ask Duncit page does: who the assistant is for (bootstrap,
 * in the current studio mode), the conversation, and every action on it.
 * Errors are reported with the server's code worded in the person's language.
 */
export function useAskDuncit() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId = null } = useParams<{ conversationId: string }>();
  const { mode } = useStudioMode();
  // A page can open Ask Duncit about itself with ?from=/pod/123 — contextual answers.
  const page = useMemo(() => pageContextFromPath(new URLSearchParams(location.search).get('from')), [location.search]);

  const bootstrap = useQuery<{ askDuncitBootstrap: Bootstrap }>(ASK_DUNCIT_BOOTSTRAP, {
    variables: { role: mode, page },
    fetchPolicy: 'cache-and-network',
  });
  const { thread, setThread, loading, loadError, loadOlder } = useAskDuncitThread(conversationId);
  const [sendMutation, sendState] = useMutation<{ sendAskDuncitMessage: SendResult }>(SEND_ASK_DUNCIT);
  const [stopMutation] = useMutation(STOP_ASK_DUNCIT);
  const [decideMutation] = useMutation<{ decideAskDuncitAction: Action }>(DECIDE_ASK_DUNCIT_ACTION);
  const [rollbackMutation] = useMutation<{ rollbackAskDuncitAction: Action }>(ROLLBACK_ASK_DUNCIT_ACTION);
  const [rateMutation] = useMutation(RATE_ASK_DUNCIT);
  const [handoverMutation, handoverState] = useMutation<{ handOverAskDuncitConversation: { ticket_no: string } }>(HANDOVER_ASK_DUNCIT);

  const report = useCallback(
    (where: string, error: unknown) => {
      logs.mWeb.warn('ask-duncit', where, { error });
      notifyError(t(errorKey(parseIssue(error).code)));
    },
    [t]
  );

  const send = useCallback(
    async (text: string, attachments: AskDuncitAttachmentView[] = []) => {
      const temp = tempMessageId();
      setThread((prev) => addOptimisticQuestion(prev, temp, text, attachments));
      try {
        const { data } = await sendMutation({
          variables: {
            input: {
              message: text,
              conversation_id: thread.conversationId,
              role: mode,
              surface: 'MWEB',
              locale,
              page,
              attachments: attachments.map(({ url, kind, name, mime, size }) => ({ url, kind, name, mime, size })),
            },
          },
        });
        const result = data?.sendAskDuncitMessage;
        if (!result) throw new TypeError('EMPTY');
        setThread((prev) => acceptTurn(prev, temp, result));
        if (!thread.conversationId) navigate(`/ask-duncit/${result.conversation_id}${location.search}`, { replace: true });
      } catch (error) {
        setThread((prev) => rejectTurn(prev, temp));
        report('send', error);
      }
    },
    [setThread, sendMutation, thread.conversationId, mode, locale, page, navigate, location.search, report]
  );

  const stop = useCallback(() => {
    if (thread.streamingId) stopMutation({ variables: { messageId: thread.streamingId } }).catch((e: unknown) => report('stop', e));
  }, [thread.streamingId, stopMutation, report]);

  const decide = useCallback(
    async (actionId: string, approve: boolean) => {
      try {
        const { data } = await decideMutation({ variables: { id: actionId, approve } });
        if (data?.decideAskDuncitAction) setThread((prev) => applyActionEvent(prev, data.decideAskDuncitAction));
      } catch (error) {
        report('decide', error);
      }
    },
    [decideMutation, setThread, report]
  );

  const rollback = useCallback(
    async (actionId: string) => {
      try {
        const { data } = await rollbackMutation({ variables: { id: actionId } });
        if (data?.rollbackAskDuncitAction) setThread((prev) => applyActionEvent(prev, data.rollbackAskDuncitAction));
      } catch (error) {
        report('rollback', error);
      }
    },
    [rollbackMutation, setThread, report]
  );

  const rate = useCallback(
    async (messageId: string, rating: 'UP' | 'DOWN') => {
      setThread((prev) => ({ ...prev, messages: prev.messages.map((m) => (m.id === messageId ? { ...m, feedback_rating: rating } : m)) }));
      try {
        await rateMutation({ variables: { messageId, rating } });
      } catch (error) {
        report('rate', error);
      }
    },
    [rateMutation, setThread, report]
  );

  const handover = useCallback(
    async (team: string, summary: string) => {
      if (!thread.conversationId) return false;
      try {
        const { data } = await handoverMutation({ variables: { conversationId: thread.conversationId, team, summary, role: mode } });
        notifySuccess(t('askDuncit.handover.done', { vars: { ticket: data?.handOverAskDuncitConversation.ticket_no ?? '' } }));
        return true;
      } catch (error) {
        report('handover', error);
        return false;
      }
    },
    [thread.conversationId, handoverMutation, mode, t, report]
  );

  const newConversation = useCallback(() => navigate(`/ask-duncit${location.search}`), [navigate, location.search]);

  return {
    bootstrap: bootstrap.data?.askDuncitBootstrap ?? null,
    bootstrapLoading: bootstrap.loading,
    bootstrapError: Boolean(bootstrap.error),
    retryBootstrap: () => bootstrap.refetch(),
    thread,
    loading,
    loadError,
    sending: sendState.loading,
    handingOver: handoverState.loading,
    loadOlder,
    send,
    stop,
    decide,
    rollback,
    rate,
    handover,
    newConversation,
  };
}

export type AskDuncitController = ReturnType<typeof useAskDuncit>;
