import { prerender } from 'react-dom/static';
import { StaticRouterProvider, createStaticHandler, createStaticRouter } from 'react-router';
import { prerenderStatic } from '@apollo/client/react/ssr';

import { App } from './app/App';
import { createStoreClient } from './app/apolloClient';
import { NOT_FOUND_ROUTE_ID, preloadPage, storeRoutes } from './app/router';
import type { StoreSsrInput, StoreSsrOutput } from './app/ssr-contract';
import { withPageCopyOnly } from './app/ssr-copy';

const handler = createStaticHandler(storeRoutes);

/**
 * The server render of one store page (bundled to dist-server/ssr by
 * vite.config.ssr.ts, called by server/main.ts). It renders as a first-time,
 * signed-out visitor: Apollo resolves every query the page makes (settings,
 * then the page, then what the page nests) and waits for the page's code
 * before the HTML is final, and its cache travels to the browser so the
 * hydrating render draws exactly this.
 */
export async function render(input: StoreSsrInput): Promise<StoreSsrOutput> {
  const client = createStoreClient({ ssrUri: input.graphqlUrl });
  // The page's code before the first pass: a page that suspends while the HTML
  // is written goes out as a boundary the browser hydrates separately, after
  // the shell — by when the shopper's own theme may already have changed it.
  await preloadPage(new URL(input.url, 'http://ecomm.local').pathname);
  const context = await handler.query(new Request(`http://ecomm.local${input.url}`, { signal: input.signal }));
  // No route here has a loader, so the handler never answers with a redirect; treat one as a miss.
  if (context instanceof Response) throw new Error(`Unexpected router response ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  // The copy keys the page reads: only those catalogue rows travel with it.
  const copyKeys = new Set<string>();
  const recordCopyKey = (key: string) => {
    copyKeys.add(key);
  };
  const { result } = await prerenderStatic({
    tree: (
      <App client={client} onCopyKey={recordCopyKey}>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </App>
    ),
    context: { client },
    // A boundary bigger than React's chunk size is written out of line and
    // swapped in by script, which the browser hydrates in a pass of its own —
    // after the shell, when the shopper's theme may already be applied. One
    // inline document hydrates in one pass.
    renderFunction: (tree) => prerender(tree, { progressiveChunkSize: Number.POSITIVE_INFINITY, signal: input.signal }),
    signal: input.signal,
  });
  const notFound = context.matches.some((match) => match.route.id === NOT_FOUND_ROUTE_ID);
  return {
    html: result,
    state: { apollo: withPageCopyOnly(client.extract() as Record<string, unknown>, copyKeys) },
    status: notFound ? 404 : 200,
  };
}
