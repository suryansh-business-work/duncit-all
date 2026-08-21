import { PromptLibraryView } from '@duncit/ai-prompts/mui';
import { apiOriginFromGraphqlUrl } from '@duncit/ai-prompts';
import { urlConfigs } from '../../config/url-configs';

/**
 * AI Library. The whole page lives in `@duncit/ai-prompts` — this portal only
 * tells it which API serves the public feed, which is the one thing that
 * differs between local, staging and production.
 */
const apiOrigin = apiOriginFromGraphqlUrl(urlConfigs.graphqlUrl);

export default function PromptLibraryPage() {
  return <PromptLibraryView apiOrigin={apiOrigin} />;
}
