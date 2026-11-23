import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import type { IntelSendInput } from '@duncit/gql-types';
import { fireAndForget } from '@duncit/logs';
import { useLiveTurns } from '../../components/ChatStream';
import { INTEL_COUNTS, INTEL_SEND, INTEL_STOP, INTEL_THREAD, type SendData, type ThreadData } from '../../graphql/chat';
import { intelLog } from '../../lib/logger';

/**
 * One conversation: its stored messages, what is streaming right now (from
 * the shell-level stream) and the send / stop actions.
 */
export function useChatThread(conversationId: string | undefined) {
  const navigate = useNavigate();
  const live = useLiveTurns();
  const [pendingText, setPendingText] = useState<string | null>(null);
  const thread = useQuery<ThreadData>(INTEL_THREAD, { variables: { id: conversationId ?? '' }, skip: !conversationId, fetchPolicy: 'cache-and-network' });
  const [sendMutation, { loading: sending }] = useMutation<SendData, { input: IntelSendInput }>(INTEL_SEND, { refetchQueries: [INTEL_COUNTS] });
  const [stopMutation] = useMutation(INTEL_STOP);
  const { refetch: refetchThread } = thread;

  const refetch = useCallback(() => {
    if (conversationId) fireAndForget(refetchThread(), intelLog, '/c', 'useChatThread');
  }, [conversationId, refetchThread]);

  /** Sends (or edits / regenerates) and moves to the conversation's own address. */
  const send = useCallback(
    async (input: IntelSendInput) => {
      setPendingText(input.regenerate ? null : (input.message ?? null));
      try {
        const res = await sendMutation({ variables: { input: { ...input, conversation_id: conversationId ?? null } } });
        const id = res.data?.intelSend.conversation_id;
        if (id && id !== conversationId) navigate(`/c/${id}`);
        else refetch();
      } finally {
        setPendingText(null);
      }
    },
    [conversationId, navigate, refetch, sendMutation]
  );

  const stop = useCallback((messageId: string) => fireAndForget(stopMutation({ variables: { message_id: messageId } }), intelLog, '/c', 'useChatThread.stop'), [stopMutation]);

  const messages = thread.data?.intelMessages ?? [];
  const streaming = messages.some((m) => m.status === 'STREAMING');
  return { conversation: thread.data?.intelConversation ?? null, messages, loading: thread.loading && !thread.data, error: thread.error ?? null, live, pendingText, sending, streaming, send, stop, refetch };
}
