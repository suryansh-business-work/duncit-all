import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { PromptLibraryView } from '@duncit/ai-prompts/mui';
import { apiOriginFromGraphqlUrl } from '@duncit/ai-prompts';
import { urlConfigs } from '../../config/url-configs';

/**
 * AI Library. The whole page lives in `@duncit/ai-prompts` — this portal only
 * tells it which API serves the public feed, which is the one thing that
 * differs between local, staging and production, and which prompt a link asked
 * for (`?prompt=<key>`, from the AI Features table).
 */
const apiOrigin = apiOriginFromGraphqlUrl(urlConfigs.graphqlUrl);

export default function PromptLibraryPage() {
  const [params, setParams] = useSearchParams();
  // Closing the dialog drops the key, so a refresh or a shared link of the page
  // afterwards does not reopen it.
  const closePrompt = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('prompt');
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );
  return (
    <PromptLibraryView apiOrigin={apiOrigin} openPromptKey={params.get('prompt')} onPromptClose={closePrompt} />
  );
}
