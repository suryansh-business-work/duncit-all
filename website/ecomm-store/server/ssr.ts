import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { SSR_END, SSR_START, SSR_STATE_GLOBAL, serializeState, type StoreSsrModule, type StoreSsrOutput } from '../src/app/ssr-contract';
import { GRAPHQL_URL } from './config';

/** A render slower than this is abandoned; the shopper gets the browser-rendered shell instead. */
const SSR_TIMEOUT_MS = 4000;

/** The React render bundle sits beside this one: dist-server/ssr/entry-server.mjs. */
const SSR_ENTRY = join(dirname(fileURLToPath(import.meta.url)), 'ssr', 'entry-server.mjs');

const logError = (step: string, error: unknown): void => {
  const reason = error instanceof Error ? error.message : 'unknown';
  process.stderr.write(`${['ssr-failed', step, reason].join(' ')}\n`);
};

let ssrModule: Promise<StoreSsrModule | null> | null = null;

/** Load the render bundle once; a build without it (local `vite dev`) simply serves the shell. */
function loadSsr(): Promise<StoreSsrModule | null> {
  ssrModule ??= (existsSync(SSR_ENTRY) ? (import(pathToFileURL(SSR_ENTRY).href) as Promise<StoreSsrModule>) : Promise.resolve(null)).catch(
    (error: unknown) => {
      logError('load', error);
      return null;
    },
  );
  return ssrModule;
}

/** The page rendered on the server, or null (no bundle, an error, too slow) to serve the shell. */
export async function renderStorePage(url: string): Promise<StoreSsrOutput | null> {
  const ssr = await loadSsr();
  if (!ssr) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SSR_TIMEOUT_MS);
  try {
    return await ssr.render({ url, graphqlUrl: GRAPHQL_URL, signal: controller.signal });
  } catch (error) {
    logError(url, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The rendered page in place of the boot loader, and the cache the browser hydrates from. */
export function injectApp(html: string, ssr: StoreSsrOutput): string {
  const start = html.indexOf(SSR_START);
  const end = html.indexOf(SSR_END);
  if (start === -1 || end < start) return html;
  const state = `<script>window.${SSR_STATE_GLOBAL}=${serializeState(ssr.state)}</script>`;
  const body = `${html.slice(0, start)}${ssr.html}${html.slice(end + SSR_END.length)}`;
  return body.replace('</body>', () => `${state}\n  </body>`);
}
