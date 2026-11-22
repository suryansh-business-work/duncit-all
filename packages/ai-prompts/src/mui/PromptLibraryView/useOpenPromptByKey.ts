import { useEffect } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import { AI_PROMPTS } from '../../queries';
import type { AiPrompt } from '../../types';

/**
 * Opens one prompt by its key, the way a link from elsewhere names it (the AI
 * Features table links each feature's code prompts as `?prompt=<key>`).
 *
 * The key is looked up across both kinds AND the archive rather than in the
 * open tab's list, so a link lands on its prompt whichever tab the page was left
 * on. The search filter narrows each read on the server; only an exact key
 * match opens.
 */
export function useOpenPromptByKey(
  key: string | null | undefined,
  onFound: (prompt: AiPrompt) => void,
  onMissing: (key: string) => void,
  onError: (message: string) => void,
): void {
  const client = useApolloClient();
  useEffect(() => {
    if (!key) return;
    // The default list leaves archived prompts out, so the archive is asked too.
    const read = (archived: boolean) =>
      client.query<{ aiPrompts: AiPrompt[] }>({
        query: AI_PROMPTS,
        variables: { filter: archived ? { search: key, archived } : { search: key } },
        fetchPolicy: 'network-only',
        errorPolicy: 'none',
      });
    Promise.all([read(false), read(true)])
      .then((answers) => {
        // A rejected query never gets here, so a resolved one carries data
        // (same narrowing as the library's own list read).
        const rows = answers.flatMap(({ data }) => (data as { aiPrompts: AiPrompt[] }).aiPrompts);
        const hit = rows.find((prompt) => prompt.key === key);
        if (hit) onFound(hit);
        else onMissing(key);
      })
      .catch((err: unknown) => onError(parseApiError(err)));
  }, [client, key, onFound, onMissing, onError]);
}
