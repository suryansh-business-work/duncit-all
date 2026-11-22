import { useParams } from 'react-router';
import { PageErrorBoundary } from '@duncit/shell';
import { PublicPromptView } from '@duncit/ai-prompts/mui';
import { apiOriginFromGraphqlUrl } from '@duncit/ai-prompts';
import { urlConfigs } from '../../config/url-configs';

const apiOrigin = apiOriginFromGraphqlUrl(urlConfigs.graphqlUrl);

/**
 * A shared AI Library prompt at `/p/<token>` — the one page in this portal that
 * needs no login. It sits outside `authed()` on purpose, so it carries its own
 * error boundary: a broken prompt must not take the visitor's tab down blank.
 */
export default function PublicPromptPage() {
  const { token = '' } = useParams<{ token: string }>();
  return (
    <PageErrorBoundary>
      <PublicPromptView token={token} apiOrigin={apiOrigin} />
    </PageErrorBoundary>
  );
}
