import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { IncomingMessage } from 'node:http';
import { env } from '../config/env';
import { SESSION_COOKIE, SSR_END, SSR_START, SSR_STATE_GLOBAL, serializeState, type LiteSsrModule, type LiteSsrOutput } from '../../shared/ssr-contract';
import { log } from '../utils/log';
import { shellHtml } from './files';
import { buildMetaTags, injectMeta, jsonLdTag } from './meta';
import { headFor } from './pages';

/** A render slower than this is abandoned; the visitor gets the client-rendered shell instead. */
const SSR_TIMEOUT_MS = 4_000;

/** The React render bundle sits beside the server bundle: dist-server/ssr/entry-server.mjs. */
const SSR_ENTRY = join(dirname(fileURLToPath(import.meta.url)), 'ssr', 'entry-server.mjs');

let ssrModule: Promise<LiteSsrModule | null> | null = null;

/** Load the render bundle once; a build without it (local `vite dev`) simply serves the shell. */
function loadSsr(): Promise<LiteSsrModule | null> {
  ssrModule ??= (existsSync(SSR_ENTRY) ? (import(pathToFileURL(SSR_ENTRY).href) as Promise<LiteSsrModule>) : Promise.resolve(null)).catch((error: unknown) => {
    log.error('html', 'loadSsr', { error });
    return null;
  });
  return ssrModule;
}

/** One cookie's value out of a Cookie header. */
export function readCookie(header: string | undefined, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === name) {
      try {
        return decodeURIComponent(part.slice(at + 1).trim()) || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function renderApp(req: IncomingMessage, url: string): Promise<LiteSsrOutput | null> {
  const ssr = await loadSsr();
  if (!ssr) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SSR_TIMEOUT_MS);
  try {
    return await ssr.render({
      url,
      token: readCookie(req.headers.cookie, SESSION_COOKIE),
      graphqlUrl: `http://127.0.0.1:${env.port}/graphql`,
      signal: controller.signal,
    });
  } catch (error) {
    log.warn('html', 'renderApp', { error, url });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The rendered app in place of the boot loader, its head tags, and the state the client hydrates from. */
export function injectApp(html: string, ssr: LiteSsrOutput): string {
  const start = html.indexOf(SSR_START);
  const end = html.indexOf(SSR_END);
  if (start === -1 || end < start) return html;
  const state = `<script>window.${SSR_STATE_GLOBAL}=${serializeState(ssr.state)}</script>`;
  const body = `${html.slice(0, start)}${ssr.html}${html.slice(end + SSR_END.length)}`.replace('</body>', `${state}\n  </body>`);
  return body.replace('</head>', `${ssr.head}\n  </head>`);
}

/**
 * A web-app page as HTML: the page's own head (title, description, Open Graph,
 * JSON-LD) for crawlers and link previews, and the React app rendered on the
 * server so the first paint is the real page. Any failure falls back to the
 * plain shell, which the client renders as before.
 */
export async function renderWebPage(req: IncomingMessage, path: string, url: string): Promise<{ html: string; status: number }> {
  let html = shellHtml('index.html');
  const [head, ssr] = await Promise.all([
    headFor(path).catch((error: unknown) => {
      log.warn('html', 'headFor', { error, path });
      return null;
    }),
    renderApp(req, url),
  ]);
  if (head) html = injectMeta(html, [buildMetaTags(head.meta), ...head.structured.map(jsonLdTag)].join('\n    '));
  if (ssr) html = injectApp(html, ssr);
  return { html, status: ssr?.status ?? 200 };
}
