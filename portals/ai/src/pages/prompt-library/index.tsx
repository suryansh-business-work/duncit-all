import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { DETAIL_TAB_PARAM, PromptLibraryView } from '@duncit/ai-prompts/mui';
import { apiOriginFromGraphqlUrl } from '@duncit/ai-prompts';
import { urlConfigs } from '../../config/url-configs';

/**
 * AI Library. The whole page lives in `@duncit/ai-prompts` — this portal only
 * tells it which API serves the public feed, which is the one thing that
 * differs between local, staging and production, and keeps the open prompt in
 * the URL (`?prompt=<key>&promptTab=<tab>`), so a prompt's details can be
 * reloaded, linked from the AI Features table, or sent to a colleague.
 */
const apiOrigin = apiOriginFromGraphqlUrl(urlConfigs.graphqlUrl);

export default function PromptLibraryPage() {
  const [params, setParams] = useSearchParams();
  const openPrompt = useCallback(
    (key: string, tab?: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('prompt', key);
          if (tab) next.set(DETAIL_TAB_PARAM, tab);
          else next.delete(DETAIL_TAB_PARAM);
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );
  // Closing drops the key (and the tab it was on), so a refresh or a shared
  // link of the page afterwards does not reopen it.
  const closePrompt = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('prompt');
          next.delete(DETAIL_TAB_PARAM);
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );
  return (
    <PromptLibraryView
      apiOrigin={apiOrigin}
      openPromptKey={params.get('prompt')}
      onPromptOpen={openPrompt}
      onPromptClose={closePrompt}
    />
  );
}
