/**
 * The Ask Duncit steps both apps run the same way around the thread reducers:
 * opening a conversation, loading the page above, and the mic button. Plain
 * functions over setters, so mWeb's and the native app's hooks only wire them
 * to their own GraphQL client and logger.
 */
import {
  emptyThread,
  prependOlder,
  voiceErrorKey,
  type AskDuncitMessageView,
  type AskDuncitThreadState,
} from './ask-duncit';
import { VOICE_ERROR_KEYS } from './ask-duncit-copy';

export interface AskDuncitPage {
  items: AskDuncitMessageView[];
  hasMore: boolean;
}

export type AskDuncitFetchPage = (conversationId: string, before?: string) => Promise<AskDuncitPage>;

export interface AskDuncitThreadSetters {
  setThread: (next: AskDuncitThreadState | ((prev: AskDuncitThreadState) => AskDuncitThreadState)) => void;
  setLoading: (loading: boolean) => void;
  onError: (error: unknown) => void;
}

/**
 * Open a conversation: its newest page replaces the thread. The conversation
 * already on screen (the one the first send just created) is kept as it is.
 * Returns the cancel function for the effect's cleanup.
 */
export function openAskDuncitThread(
  conversationId: string | null,
  current: AskDuncitThreadState,
  fetchPage: AskDuncitFetchPage,
  io: AskDuncitThreadSetters & { setLoadError: (failed: boolean) => void },
): () => void {
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };
  if (!conversationId) {
    io.setThread(emptyThread(null));
    return cancel;
  }
  if (current.conversationId === conversationId && current.messages.length) return cancel;
  io.setLoading(true);
  io.setLoadError(false);
  fetchPage(conversationId)
    .then((page) => {
      if (!cancelled) io.setThread({ ...emptyThread(conversationId), messages: page.items, hasMore: page.hasMore });
    })
    .catch((error: unknown) => {
      io.onError(error);
      if (!cancelled) io.setLoadError(true);
    })
    .finally(() => {
      if (!cancelled) io.setLoading(false);
    });
  return cancel;
}

/** The page above the oldest stored message; temporary ids never reach the server. */
export async function loadOlderAskDuncit(
  current: AskDuncitThreadState,
  busy: boolean,
  fetchPage: AskDuncitFetchPage,
  io: AskDuncitThreadSetters,
): Promise<void> {
  if (!current.conversationId || !current.hasMore || busy) return;
  const first = current.messages.find((m) => !m.id.startsWith('temp-'));
  io.setLoading(true);
  try {
    const page = await fetchPage(current.conversationId, first?.id);
    io.setThread((prev) => prependOlder(prev, page.items, page.hasMore));
  } catch (error) {
    io.onError(error);
  } finally {
    io.setLoading(false);
  }
}

/** Dictated text goes after what is already typed. */
export const appendHeard = (typed: string, heard: string): string => (typed ? `${typed} ${heard}` : heard);

/**
 * The mic button: start recording, or stop and hand over what was heard.
 * Returns the copy key of the error to show, or null.
 */
export async function toggleAskDuncitMic(
  recording: boolean,
  voice: { start: () => Promise<string | null>; stop: () => Promise<string | null> },
  onHeard: (text: string) => void,
): Promise<string | null> {
  if (!recording) {
    const refused = await voice.start();
    return refused ? voiceErrorKey(refused) : null;
  }
  const heard = await voice.stop();
  if (!heard) return VOICE_ERROR_KEYS.FAILED;
  onHeard(heard);
  return null;
}
