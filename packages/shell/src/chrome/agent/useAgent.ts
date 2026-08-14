import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { createLogger } from '@duncit/logs';
import { AGENT_CHAT, type AgentReply, type AgentResultItem } from './queries';

const logger = createLogger('portal');

export interface AgentMessage {
  id: string;
  role: 'USER' | 'AGENT';
  content: string;
  items?: AgentResultItem[];
}

/**
 * One conversation with the Agent.
 *
 * The thread is local to the panel, and only the TEXT of each turn is sent
 * back for context — never the results. What was created is already a row in
 * the database; replaying it into the next prompt would only invite the model
 * to talk about pods as though it were about to make them again.
 */
export function useAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState(false);
  const [chat, { loading }] = useMutation<{ agentChat: AgentReply }>(AGENT_CHAT);
  // A counter, not the message count: a failed turn leaves the request in the
  // thread, so lengths repeat and a length-derived id would collide (S6479).
  const seq = useRef(0);

  const nextId = () => {
    seq.current += 1;
    return `a${seq.current}`;
  };

  const run = useCallback(
    async (request: string) => {
      setError(false);
      // Captured before the state update so the request carries the thread as
      // it was — the new instruction travels in `message`, not twice.
      const history = messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));
      setMessages((current) => [...current, { id: nextId(), role: 'USER', content: request }]);

      const result = await chat({
        variables: { input: { message: request, history } },
      }).catch((err: unknown) => {
        logger.warn('agent', 'agentChat', { error: err, msg: 'Agent turn failed' });
        return null;
      });

      const reply = result?.data?.agentChat;
      if (!reply) {
        setError(true);
        return;
      }
      setMessages((current) => [
        ...current,
        { id: nextId(), role: 'AGENT', content: reply.answer, items: reply.items },
      ]);
    },
    [chat, messages]
  );

  /**
   * Fire the turn. Synchronous by design so no caller is left holding a promise
   * it has no use for; `run` already reports its own failures, and the catch
   * here exists so a genuinely unexpected one is logged rather than dropped.
   */
  const send = useCallback(
    (text: string) => {
      const request = text.trim();
      if (!request || loading) return;
      run(request).catch((err: unknown) => {
        setError(true);
        logger.error('agent', 'send', { error: err, msg: 'Agent turn threw' });
      });
    },
    [loading, run]
  );

  const restart = useCallback(() => {
    setMessages([]);
    setError(false);
  }, []);

  return { messages, error, loading, send, restart, dismissError: () => setError(false) };
}
