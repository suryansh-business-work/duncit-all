import { renderToStaticMarkup } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import { StaticRouterProvider, createStaticHandler, createStaticRouter } from 'react-router';
import { prerenderStatic } from '@apollo/client/react/ssr';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { createLiteClient } from '../shared/apollo';
import { STORAGE_KEYS } from '../shared/env';
import type { LiteSsrInput, LiteSsrOutput } from '../shared/ssr-contract';
import { COLOR_SCHEME_SELECTOR, MODE_STORAGE_KEY } from '../shared/theme';
import { App } from './App';
import { NOT_FOUND_ROUTE_ID, routes } from './routes';

const handler = createStaticHandler(routes);

/** Runs before first paint: sets <html data-lite-mode> from the reader's choice, so dark never flashes light. */
const colorSchemeScript = renderToStaticMarkup(<InitColorSchemeScript attribute={COLOR_SCHEME_SELECTOR} defaultMode="dark" modeStorageKey={MODE_STORAGE_KEY} />);

/**
 * The server render of one web-app page (bundled to dist-server/ssr by
 * vite.config.ssr.ts, called by server/html/render.ts). Apollo resolves
 * every query the page makes before the HTML is final, and its cache travels
 * to the browser so the first client render matches this one exactly.
 */
export async function render(input: LiteSsrInput): Promise<LiteSsrOutput> {
  const client = createLiteClient(STORAGE_KEYS.token, 'WEBSITE', { ssr: { uri: input.graphqlUrl, token: input.token } });
  const context = await handler.query(new Request(`http://lite.local${input.url}`, { signal: input.signal }));
  // No route here has a loader, so the handler never answers with a redirect; treat one as a miss.
  if (context instanceof Response) throw new Error(`Unexpected router response ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  const { result } = await prerenderStatic({
    tree: (
      <App client={client} initialToken={input.token}>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </App>
    ),
    context: { client },
    renderFunction: prerender,
    signal: input.signal,
  });
  const notFound = context.matches.some((match) => match.route.id?.startsWith(NOT_FOUND_ROUTE_ID));
  return {
    html: result,
    head: colorSchemeScript,
    state: { apollo: client.extract(), signedIn: Boolean(input.token) },
    status: notFound ? 404 : 200,
  };
}
