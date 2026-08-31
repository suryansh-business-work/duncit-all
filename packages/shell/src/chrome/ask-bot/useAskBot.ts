import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { createLogger } from '@duncit/logs';
import { ASK_BOT_CHAT, type AskBotLink, type AskBotReply } from './queries';

const logger = createLogger('portal');

export interface BotMessage {
  id: string;
  role: 'USER' | 'BOT';
  content: string;
  links?: AskBotLink[];
}

/**
 * One conversation with one bot.
 *
 * The thread is local to the dialog on purpose — this is a lookup, not a
 * correspondence, and nothing here is worth keeping once the answer has been
 * acted on. What IS sent back each turn is the thread so far, so "and in the
 * app?" still knows what "it" was.
 */
export function useAskBot(botKey: string) {
  const [messages, setMessages] = useState<BotMessage[]>([]);
  // Only the newest answer's, and only until the next question: chips for a
  // question already asked are noise, and they pile up fast.
  const [followups, setFollowups] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [chat, { loading }] = useMutation<{ askBotChat: AskBotReply }>(ASK_BOT_CHAT);
  // A counter, not the message count: a failed turn leaves the question in the
  // thread, so lengths repeat and a length-derived id would collide (S6479).
  const seq = useRef(0);

  const nextId = () => {
    seq.current += 1;
    return `m${seq.current}`;
  };

  const run = useCallback(
    async (question: string) => {
      setError(false);
      setFollowups([]);
      // Captured before the state update so the request carries the thread as it
      // was — the new question travels in `message`, not twice.
      const history = messages.map((message) => ({ role: message.role, content: message.content }));
      setMessages((current) => [...current, { id: nextId(), role: 'USER', content: question }]);

      const result = await chat({
        variables: { input: { bot_key: botKey, message: question, history } },
      }).catch((err: unknown) => {
        logger.warn('ask-bot', 'askBotChat', { error: err, msg: 'Ask Bot turn failed' });
        return null;
      });

      const reply = result?.data?.askBotChat;
      if (!reply) {
        setError(true);
        return;
      }
      setMessages((current) => [
        ...current,
        { id: nextId(), role: 'BOT', content: reply.answer, links: reply.links },
      ]);
      setFollowups(reply.followups);
    },
    [botKey, chat, messages]
  );

  /**
   * Fire the turn. Synchronous by design so no caller is left holding a promise
   * it has no use for; `run` already reports its own failures, and the catch
   * here exists so a genuinely unexpected one is logged rather than dropped.
   */
  const send = useCallback(
    (text: string) => {
      const question = text.trim();
      if (!question || loading) return;
      run(question).catch((err: unknown) => {
        setError(true);
        logger.error('ask-bot', 'send', { error: err, msg: 'Ask Bot turn threw' });
      });
    },
    [loading, run]
  );

  const restart = useCallback(() => {
    setMessages([]);
    setFollowups([]);
    setError(false);
  }, []);

  return { messages, followups, error, loading, send, restart, dismissError: () => setError(false) };
}
