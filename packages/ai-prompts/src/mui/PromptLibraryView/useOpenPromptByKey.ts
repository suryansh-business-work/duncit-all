import { useEffect } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import { AI_PROMPTS } from '../../queries';
import type { AiPrompt } from '../../types';

/**
 * Opens one prompt by its key, the way a link from elsewhere names it (the AI
 * Features table links each feature's code prompts as `?prompt=<key>`).
 *
 * The key is looked up across both kinds rather than in the open tab's list,
 * so a link lands on its prompt whichever tab the page was left on. The search
 * filter narrows the read on the server; only an exact key match opens.
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
    client
      .query<{ aiPrompts: AiPrompt[] }>({
        query: AI_PROMPTS,
        variables: { filter: { search: key } },
        fetchPolicy: 'network-only',
        errorPolicy: 'none',
      })
      .then(({ data }) => {
        // A rejected query never gets here, so a resolved one carries data
        // (same narrowing as the library's own list read).
        const hit = (data as { aiPrompts: AiPrompt[] }).aiPrompts.find((prompt) => prompt.key === key);
        if (hit) onFound(hit);
        else onMissing(key);
      })
      .catch((err: unknown) => onError(parseApiError(err)));
  }, [client, key, onFound, onMissing, onError]);
}
